-- Lot 6A : catalogue officiel, bornes du catalogue perso, contrôle d'exercice à l'insertion.
-- Même DDL que supabase/apply/45, 50, 51 et 52. Les lignes de catalogue_officiel viennent de pnpm db:seed-catalogue (apply/46_*.sql).
-- Relançable. Ne touche pas aux migrations 0000 à 0003 ni à la logique des lots 1 à 5.

-- Catalogue officiel : lecture seule pour les joueurs. Rejouable.
create table if not exists public.catalogue_officiel (
  exercice_id text primary key,
  competence_id text not null,
  focus_id text not null,
  duree_min integer not null,
  duree_max integer not null,
  difficulte text not null,
  niveau integer not null,
  constraint catalogue_officiel_duree_check check (duree_min >= 2 and duree_max >= duree_min and duree_max <= 60),
  constraint catalogue_officiel_difficulte_check check (difficulte in ('facile', 'moyen', 'difficile')),
  constraint catalogue_officiel_niveau_check check (niveau between 1 and 5)
);

alter table public.catalogue_officiel enable row level security;

revoke all on table public.catalogue_officiel from anon, authenticated;
grant select on table public.catalogue_officiel to authenticated;

drop policy if exists catalogue_officiel_select on public.catalogue_officiel;
create policy catalogue_officiel_select on public.catalogue_officiel
  for select to authenticated
  using (true);
-- Bornes du catalogue perso (json custom_catalog.data.catalogPerso). auth.uid() nul : scripts.
create or replace function public._custom_catalog_limites()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
$$;

revoke all on function public._custom_catalog_limites() from public, anon, authenticated;

drop trigger if exists custom_catalog_limites on public.custom_catalog;
create trigger custom_catalog_limites
  before insert or update on public.custom_catalog
  for each row
  execute function public._custom_catalog_limites();
-- Daily : exercice officiel ou perso du joueur. Écrase perso, prevue, niveauMoyen.
-- auth.uid() est déjà non nul (l'appelant saute les scripts et le type first).
create or replace function public._mission_lier_exercice(
  p_uid uuid, p_date date, p_duree integer, p_diff text, p_competence text, p_payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
$$;

revoke all on function public._mission_lier_exercice(uuid, date, integer, text, text, jsonb) from public, anon, authenticated;
-- Étend le BEFORE INSERT : une daily cite un exercice. first inchangé. uid nul : scripts.
create or replace function public._missions_limites_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  nb integer;
  tz text;
  jour date;
begin
  if uid is null then
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
$$;

revoke all on function public._missions_limites_insert() from public, anon, authenticated;
