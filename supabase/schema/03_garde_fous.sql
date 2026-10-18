-- Limites et triggers. Seul _skill_choices_mode_demain est corrigé (jour local + INSERT guidé).
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  g text;
begin
  g := lower(trim(coalesce(new.raw_user_meta_data->>'gender', '')));
  if g not in ('male', 'female') then
    g := 'male';
  end if;

  insert into public.profiles (id, pseudo, timezone, onboarding_done, is_admin, gender)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'pseudo'), ''),
      split_part(new.email, '@', 1),
      'joueur'
    ),
    'Europe/Paris',
    false,
    false,
    g
  )
  on conflict (id) do nothing;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.protect_profile_admin()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.is_admin := false;
    end if;
    return new;
  end if;

  if new.is_admin is distinct from old.is_admin then
    if auth.uid() is not null then
      raise exception 'is_admin ne peut pas être modifié';
    end if;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.forbid_xp_ledger_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  raise exception 'xp_ledger est append-only';
end;
$function$
;

CREATE OR REPLACE FUNCTION public._skill_choices_limites()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  nb integer;
  cible uuid;
begin
  if uid is null then
    return coalesce(new, old);
  end if;

  cible := coalesce(new.user_id, old.user_id);
  if cible is distinct from uid then
    return coalesce(new, old);
  end if;

  select count(*) into nb
  from public.user_skill_choices
  where user_id = uid;

  -- Upsert d'une compétence déjà active : le BEFORE INSERT voit encore la ligne.
  if tg_op = 'INSERT'
     and not exists (
       select 1 from public.user_skill_choices
       where user_id = uid and competence_id = new.competence_id
     )
     and nb >= 5 then
    raise exception 'limite atteinte : 5 compétences actives' using errcode = '22023';
  end if;
  if tg_op = 'DELETE' and nb <= 1 then
    raise exception 'il te faut au moins une compétence' using errcode = '22023';
  end if;

  return coalesce(new, old);
end;
$function$
;

CREATE OR REPLACE FUNCTION public._missions_limites_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  nb integer;
  tz text;
  jour date;
begin
  if uid is null then
    return new;
  end if;

  if coalesce(new.payload->>'source', '') = 'calendrier' then
    if new.type is distinct from 'side' then
      raise exception 'type de mission invalide' using errcode = '22023';
    end if;
    if new.duree_min is null or new.duree_min < 2 or new.duree_min > 60 then
      raise exception 'durée invalide : 2 à 60 minutes' using errcode = '22023';
    end if;
    if new.difficulte is null or new.difficulte not in ('facile', 'moyen', 'difficile') then
      raise exception 'difficulté invalide' using errcode = '22023';
    end if;
    if new.statut is distinct from 'a_faire' then
      raise exception 'statut invalide : une mission naît à faire' using errcode = '22023';
    end if;
    return new;
  end if;

  if new.duree_min is null or new.duree_min < 2 or new.duree_min > 60 then
    raise exception 'durée invalide : 2 à 60 minutes' using errcode = '22023';
  end if;
  if new.difficulte is null or new.difficulte not in ('facile', 'moyen', 'difficile') then
    raise exception 'difficulté invalide' using errcode = '22023';
  end if;
  if new.type is null or new.type not in ('daily', 'first') then
    raise exception 'type de mission invalide' using errcode = '22023';
  end if;
  if new.statut is distinct from 'a_faire' then
    raise exception 'statut invalide : une mission naît à faire' using errcode = '22023';
  end if;

  select timezone into tz from public.profiles where id = uid;
  jour := public.jour_local(now(), coalesce(nullif(tz, ''), 'Europe/Paris'));
  if new.date_locale is distinct from jour
     and new.date_locale is distinct from (jour + 1) then
    raise exception 'date invalide : aujourd''hui ou demain' using errcode = '22023';
  end if;

  if new.type = 'daily' then
    new.payload := public._mission_lier_exercice(
      uid, new.date_locale, new.duree_min, new.difficulte, new.competence_id, new.payload
    );
  end if;

  perform pg_advisory_xact_lock(hashtextextended(uid::text || ':' || new.date_locale::text, 0));

  select count(*) into nb
  from public.missions
  where user_id = uid and date_locale = new.date_locale and statut <> 'annulee';

  if nb >= 12 then
    raise exception 'limite atteinte : 12 missions par jour' using errcode = '22023';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public._mission_lier_exercice(p_uid uuid, p_date date, p_duree integer, p_diff text, p_competence text, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  payload jsonb := coalesce(p_payload, '{}'::jsonb);
  ids text[];
  exo text;
  controle boolean;
  perso boolean := false;
  off_min integer; off_max integer; off_diff text;
  p_val integer; p_difficulte text;
  moyenne numeric;
  tz text;
  jour date;
begin
  ids := array(
    select distinct t.x from (
      select payload->>'exerciceId' as x
      union all
      select jsonb_array_elements_text(case when jsonb_typeof(payload->'exerciceIds') = 'array' then payload->'exerciceIds' else '[]'::jsonb end)
      union all
      select e->>'exerciceId' from jsonb_array_elements(
        case when jsonb_typeof(payload #> '{seance,exercices}') = 'array' then payload #> '{seance,exercices}' else '[]'::jsonb end
      ) e
    ) t where t.x is not null and t.x <> ''
  );
  if coalesce(array_length(ids, 1), 0) = 0 then
    raise exception 'exercice inconnu' using errcode = '22023';
  end if;

  controle := coalesce(jsonb_array_length(
    case when jsonb_typeof(payload #> '{seance,exercices}') = 'array' then payload #> '{seance,exercices}' else '[]'::jsonb end
  ), 0) <= 1;

  foreach exo in array ids loop
    select duree_min, duree_max, difficulte into off_min, off_max, off_diff
    from public.catalogue_officiel where exercice_id = exo;
    if found then
      if controle and (p_duree < off_min or p_duree > off_max or p_diff is distinct from off_diff) then
        raise exception 'exercice non conforme' using errcode = '22023';
      end if;
    else
      select (e->>'valeur')::integer, e->>'difficulte' into p_val, p_difficulte
      from public.custom_catalog c,
           jsonb_array_elements(coalesce(c.data #> '{catalogPerso,exercices}', '[]'::jsonb)) e
      where c.user_id = p_uid and e->>'id' = exo;
      if not found then
        raise exception 'exercice inconnu' using errcode = '22023';
      end if;
      perso := true;
      if controle and (p_duree is distinct from p_val or p_diff is distinct from p_difficulte) then
        raise exception 'exercice non conforme' using errcode = '22023';
      end if;
    end if;
  end loop;

  select p.timezone into tz from public.profiles p where p.id = p_uid;
  jour := public.jour_local(now(), coalesce(nullif(tz, ''), 'Europe/Paris'));
  select avg(sp.niveau) into moyenne from public.skill_progress sp
  where sp.user_id = p_uid and sp.competence_id = p_competence;

  payload := jsonb_set(payload, '{perso}', to_jsonb(perso), true);
  payload := jsonb_set(payload, '{prevue}', to_jsonb(p_date > jour), true);
  if moyenne is null then payload := payload - 'niveauMoyen';
  else payload := jsonb_set(payload, '{niveauMoyen}', to_jsonb(moyenne), true);
  end if;
  return payload;
end;
$function$
;

CREATE OR REPLACE FUNCTION public._custom_catalog_limites()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  n integer;
  e jsonb;
  lien text;
begin
  if uid is null or new.user_id is distinct from uid then
    return new;
  end if;

  n := coalesce(jsonb_array_length(new.data->'catalogPerso'->'competences'), 0)
     + coalesce(jsonb_array_length(new.data->'catalogPerso'->'focus'), 0)
     + coalesce(jsonb_array_length(new.data->'catalogPerso'->'exercices'), 0);
  if n > 30 then
    raise exception 'limite atteinte : 30 éléments perso' using errcode = '22023';
  end if;

  for e in select * from jsonb_array_elements(coalesce(new.data->'catalogPerso'->'competences', '[]'::jsonb)) loop
    if char_length(coalesce(e->>'nom', '')) < 1 or char_length(e->>'nom') > 60 then
      raise exception 'nom invalide : 60 caractères maximum' using errcode = '22023';
    end if;
    if coalesce(e->>'domaine', '') not in (
      'Finance', 'Mental', 'Santé', 'Physique', 'Discipline & Productivité', 'Vie personnelle'
    ) then
      raise exception 'domaine invalide' using errcode = '22023';
    end if;
  end loop;

  for e in select * from jsonb_array_elements(coalesce(new.data->'catalogPerso'->'focus', '[]'::jsonb)) loop
    if char_length(coalesce(e->>'nom', '')) < 1 or char_length(e->>'nom') > 60 then
      raise exception 'nom invalide : 60 caractères maximum' using errcode = '22023';
    end if;
  end loop;

  for e in select * from jsonb_array_elements(coalesce(new.data->'catalogPerso'->'exercices', '[]'::jsonb)) loop
    if char_length(coalesce(e->>'nom', '')) < 1 or char_length(e->>'nom') > 60 then
      raise exception 'nom invalide : 60 caractères maximum' using errcode = '22023';
    end if;
    if char_length(coalesce(e->>'consigne', '')) > 300 then
      raise exception 'consigne invalide : 300 caractères maximum' using errcode = '22023';
    end if;
    if coalesce((e->>'valeur')::integer, 0) < 2 or (e->>'valeur')::integer > 30 then
      raise exception 'durée invalide : 2 à 30 minutes' using errcode = '22023';
    end if;
    if coalesce(e->>'difficulte', '') not in ('facile', 'moyen', 'difficile') then
      raise exception 'difficulté invalide' using errcode = '22023';
    end if;
    lien := nullif(e->>'lien', '');
    if lien is not null and lien !~ '^https://[^[:space:]]+$' then
      raise exception 'lien invalide : https seulement' using errcode = '22023';
    end if;
  end loop;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public._exercice_prefs_limites()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  n integer;
begin
  if uid is null then
    return new;
  end if;
  if new.user_id is distinct from uid then
    raise exception 'interdit' using errcode = '42501';
  end if;
  select count(*) into n from public.exercice_prefs where user_id = uid;
  if tg_op = 'INSERT' and n >= 50 then
    raise exception 'limite atteinte : 50 préférences' using errcode = '22023';
  end if;
  return new;
end;
$function$
;

-- Un changement de mode (y compris DELETE+INSERT) s'applique au jour local suivant.
create or replace function public._skill_choices_mode_demain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tz text;
  jour date;
begin
  if auth.uid() is null then
    return new;
  end if;
  select timezone into tz from public.profiles where id = auth.uid();
  jour := public.jour_local(now(), coalesce(nullif(tz, ''), 'Europe/Paris'));
  if tg_op = 'INSERT' then
    new.mode := coalesce(new.mode, 'guide');
    new.mode_en_vigueur := 'guide';
    new.mode_depuis := case when new.mode = 'guide' then jour else jour + 1 end;
    return new;
  end if;
  if new.mode is distinct from old.mode then
    new.mode_en_vigueur := old.mode_en_vigueur;
    new.mode_depuis := jour + 1;
  else
    new.mode_depuis := old.mode_depuis;
    if new.mode_en_vigueur is distinct from old.mode_en_vigueur
       and (new.mode_en_vigueur is distinct from new.mode or old.mode_depuis > jour) then
      new.mode_en_vigueur := old.mode_en_vigueur;
    end if;
  end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public._profiles_timezone_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.timezone is not distinct from old.timezone then
    return new;
  end if;

  if new.timezone is null
     or not exists (select 1 from pg_timezone_names n where n.name = new.timezone) then
    raise exception 'fuseau invalide' using errcode = '22023';
  end if;

  if old.timezone_changed_at is not null
     and old.timezone_changed_at > now() - interval '7 days' then
    raise exception 'fuseau déjà changé récemment' using errcode = '22023';
  end if;

  -- Un jour local déjà crédité ne doit pas se rouvrir en changeant de fuseau.
  if exists (
    select 1 from public.xp_ledger l
    where l.user_id = old.id
      and public.jour_local(l.created_at, old.timezone) = public.jour_local(now(), old.timezone)
  ) then
    raise exception 'fuseau bloqué : XP déjà créditée aujourd''hui' using errcode = '22023';
  end if;

  new.timezone_changed_at := now();
  return new;
end;
$function$
;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists protect_profile_admin on public.profiles;
create trigger protect_profile_admin
  before insert or update on public.profiles
  for each row execute function public.protect_profile_admin();

drop trigger if exists profiles_timezone_update on public.profiles;
create trigger profiles_timezone_update
  before update on public.profiles
  for each row execute function public._profiles_timezone_update();

drop trigger if exists xp_ledger_no_update on public.xp_ledger;
create trigger xp_ledger_no_update
  before update on public.xp_ledger
  for each row execute function public.forbid_xp_ledger_update();

drop trigger if exists skill_choices_limites_ins on public.user_skill_choices;
create trigger skill_choices_limites_ins
  before insert on public.user_skill_choices
  for each row execute function public._skill_choices_limites();

drop trigger if exists skill_choices_limites_del on public.user_skill_choices;
create trigger skill_choices_limites_del
  before delete on public.user_skill_choices
  for each row execute function public._skill_choices_limites();

drop trigger if exists skill_choices_mode_demain on public.user_skill_choices;
create trigger skill_choices_mode_demain
  before insert or update on public.user_skill_choices
  for each row execute function public._skill_choices_mode_demain();

drop trigger if exists missions_limites_insert on public.missions;
create trigger missions_limites_insert
  before insert on public.missions
  for each row execute function public._missions_limites_insert();

drop trigger if exists custom_catalog_limites on public.custom_catalog;
create trigger custom_catalog_limites
  before insert or update on public.custom_catalog
  for each row execute function public._custom_catalog_limites();

drop trigger if exists exercice_prefs_limites on public.exercice_prefs;
create trigger exercice_prefs_limites
  before insert or update on public.exercice_prefs
  for each row execute function public._exercice_prefs_limites();

CREATE OR REPLACE FUNCTION public._calendar_events_limites()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if tg_op = 'DELETE' then
    if old.statut = 'terminee' and current_user in ('authenticated', 'anon') then
      raise exception 'événement terminé : suppression interdite' using errcode = '22023';
    end if;
    return old;
  end if;

  if auth.uid() is not null and new.user_id is distinct from auth.uid() then
    raise exception 'interdit' using errcode = '42501';
  end if;

  new.titre := trim(new.titre);
  if new.titre is null or char_length(new.titre) < 1 or char_length(new.titre) > 80 then
    raise exception 'titre invalide : 1 à 80 caractères' using errcode = '22023';
  end if;
  if char_length(coalesce(new.description, '')) > 2000 then
    raise exception 'description trop longue' using errcode = '22023';
  end if;
  if new.end_at <= new.start_at then
    raise exception 'heure invalide : la fin doit être après le début' using errcode = '22023';
  end if;
  if extract(epoch from (new.end_at - new.start_at)) < 60 then
    raise exception 'durée invalide : au moins une minute' using errcode = '22023';
  end if;

  if new.kind = 'productive' then
    if new.domaine is null or new.difficulte is null then
      raise exception 'tâche productive : pilier et difficulté requis' using errcode = '22023';
    end if;
  else
    new.domaine := null;
    new.difficulte := null;
    new.xp_prevu := 0;
  end if;

  if tg_op = 'UPDATE' then
    if old.statut = 'terminee' then
      new.statut := old.statut;
      new.mission_id := old.mission_id;
      new.xp_gagne := old.xp_gagne;
      new.completed_at := old.completed_at;
      new.kind := old.kind;
      new.difficulte := old.difficulte;
      new.domaine := old.domaine;
    end if;
    if current_user in ('authenticated', 'anon') then
      if new.statut = 'terminee' and old.statut is distinct from 'terminee' then
        raise exception 'termine via terminer_evenement_calendrier' using errcode = '42501';
      end if;
      if new.mission_id is distinct from old.mission_id then
        raise exception 'mission_id réservé au serveur' using errcode = '42501';
      end if;
      if new.xp_gagne is distinct from old.xp_gagne then
        raise exception 'xp_gagne réservé au serveur' using errcode = '42501';
      end if;
    end if;
  end if;

  if tg_op = 'INSERT' then
    if new.statut is distinct from 'planifiee' then
      new.statut := 'planifiee';
    end if;
    new.mission_id := null;
    new.xp_gagne := null;
    new.completed_at := null;
  end if;

  new.updated_at := now();
  return new;
end;
$function$
;

drop trigger if exists calendar_events_limites on public.calendar_events;
create trigger calendar_events_limites
  before insert or update or delete on public.calendar_events
  for each row execute function public._calendar_events_limites();

