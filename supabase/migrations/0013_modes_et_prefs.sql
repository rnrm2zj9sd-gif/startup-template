-- Lot 6B : modes guidé/mixte/libre, préférences d'exercices, remplacer_mission.
-- Même DDL que supabase/apply/54 à 64. Relançable. Ne touche pas 0000–0003 ni lots 1–6A.

-- supabase/apply/54_skill_choices_mode_vigueur.sql
-- Mode souhaité vs mode en vigueur (effet dès demain). Rejouable.
alter table public.user_skill_choices
  add column if not exists mode_en_vigueur text;

alter table public.user_skill_choices
  add column if not exists mode_depuis date;

update public.user_skill_choices
   set mode_en_vigueur = coalesce(nullif(mode_en_vigueur, ''), mode, 'guide'),
       mode_depuis = coalesce(mode_depuis, current_date)
 where mode_en_vigueur is null or mode_depuis is null;

alter table public.user_skill_choices
  alter column mode_en_vigueur set default 'guide';
alter table public.user_skill_choices
  alter column mode_en_vigueur set not null;
alter table public.user_skill_choices
  alter column mode_depuis set default current_date;
alter table public.user_skill_choices
  alter column mode_depuis set not null;

do $$ begin
  alter table public.user_skill_choices
    add constraint user_skill_choices_mode_en_vigueur_check
    check (mode_en_vigueur in ('guide', 'mixte', 'libre'));
exception when duplicate_object then null;
end $$;

-- supabase/apply/55_exercice_prefs.sql
-- Préférences d'exercices (épinglé / masqué). Un exercice, un seul kind.
create table if not exists public.exercice_prefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercice_id text not null,
  kind text not null,
  constraint exercice_prefs_kind_check check (kind in ('epingle', 'masque'))
);

create unique index if not exists exercice_prefs_user_exo_uidx
  on public.exercice_prefs (user_id, exercice_id);

create index if not exists exercice_prefs_user_idx
  on public.exercice_prefs (user_id);

-- supabase/apply/56_exercice_prefs_rls.sql
-- RLS : le joueur lit et écrit uniquement ses lignes.
alter table public.exercice_prefs enable row level security;

revoke all on table public.exercice_prefs from anon, authenticated;
grant select, insert, update, delete on table public.exercice_prefs to authenticated;

drop policy if exists exercice_prefs_select_own on public.exercice_prefs;
create policy exercice_prefs_select_own on public.exercice_prefs
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists exercice_prefs_insert_own on public.exercice_prefs;
create policy exercice_prefs_insert_own on public.exercice_prefs
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists exercice_prefs_update_own on public.exercice_prefs;
create policy exercice_prefs_update_own on public.exercice_prefs
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists exercice_prefs_delete_own on public.exercice_prefs;
create policy exercice_prefs_delete_own on public.exercice_prefs
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- supabase/apply/57_exercice_prefs_limites.sql
-- 50 préférences maximum par joueur. auth.uid() nul : scripts.
create or replace function public._exercice_prefs_limites()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
$$;

revoke all on function public._exercice_prefs_limites() from public, anon, authenticated;

-- supabase/apply/58_exercice_prefs_trigger.sql
drop trigger if exists exercice_prefs_limites on public.exercice_prefs;
create trigger exercice_prefs_limites
  before insert or update on public.exercice_prefs
  for each row
  execute function public._exercice_prefs_limites();

-- supabase/apply/59_missions_daily_unique_annulee.sql
-- Remplacer : l'ancienne daily annulée n'occupe plus la place.
-- Libre : les missions ajoutées (payload.source = libre) n'entrent pas dans l'unicité par compétence.
drop index if exists public.missions_user_date_competence_daily_uidx;

create unique index if not exists missions_user_date_competence_daily_uidx
  on public.missions (user_id, date_locale, competence_id)
  where type = 'daily'
    and statut <> 'annulee'
    and coalesce(payload->>'source', '') <> 'libre';

-- supabase/apply/60_skill_choices_mode_demain.sql
-- Un changement de mode côté joueur s'applique demain. Scripts (uid nul) : pas de délai.
create or replace function public._skill_choices_mode_demain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.mode := coalesce(new.mode, 'guide');
    new.mode_en_vigueur := coalesce(new.mode, 'guide');
    new.mode_depuis := current_date;
    return new;
  end if;
  if new.mode is distinct from old.mode then
    new.mode_en_vigueur := old.mode_en_vigueur;
    new.mode_depuis := current_date + 1;
  elsif new.mode_en_vigueur is distinct from old.mode_en_vigueur
     and (new.mode_en_vigueur is distinct from new.mode or old.mode_depuis > current_date) then
    new.mode_en_vigueur := old.mode_en_vigueur;
  end if;
  return new;
end;
$$;

revoke all on function public._skill_choices_mode_demain() from public, anon, authenticated;

drop trigger if exists skill_choices_mode_demain on public.user_skill_choices;
create trigger skill_choices_mode_demain
  before insert or update on public.user_skill_choices
  for each row
  execute function public._skill_choices_mode_demain();

-- supabase/apply/61_appliquer_modes_du_jour.sql
-- Passe le mode souhaité en vigueur dès que la date est atteinte.
create or replace function public.appliquer_modes_du_jour()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  tz text;
  jour date;
begin
  if uid is null then
    return;
  end if;
  select timezone into tz from public.profiles where id = uid;
  jour := public.jour_local(now(), coalesce(nullif(tz, ''), 'Europe/Paris'));
  update public.user_skill_choices
     set mode_en_vigueur = mode
   where user_id = uid
     and mode_depuis <= jour
     and mode_en_vigueur is distinct from mode;
end;
$$;

revoke all on function public.appliquer_modes_du_jour() from public, anon;
grant execute on function public.appliquer_modes_du_jour() to authenticated;

-- supabase/apply/62_exercice_joueur.sql
-- Résout un exercice officiel ou perso du joueur : zone, durée, difficulté, perso.
create or replace function public._exercice_joueur(p_uid uuid, p_exercice_id text, p_duree integer)
returns table (focus_id text, duree integer, difficulte text, perso boolean)
language plpgsql
stable
set search_path = public
as $$
declare
  off_min integer; off_max integer; off_diff text; off_focus text;
  p_val integer; p_diff text; p_focus text;
begin
  select c.focus_id, c.duree_min, c.duree_max, c.difficulte
    into off_focus, off_min, off_max, off_diff
    from public.catalogue_officiel c where c.exercice_id = p_exercice_id;
  if found then
    return query select off_focus, least(off_max, greatest(off_min, coalesce(p_duree, off_min))), off_diff, false;
    return;
  end if;
  select e->>'focusId', (e->>'valeur')::integer, e->>'difficulte'
    into p_focus, p_val, p_diff
    from public.custom_catalog c,
         jsonb_array_elements(coalesce(c.data #> '{catalogPerso,exercices}', '[]'::jsonb)) e
   where c.user_id = p_uid and e->>'id' = p_exercice_id;
  if not found then
    return;
  end if;
  return query select p_focus, p_val, p_diff, true;
end;
$$;

revoke all on function public._exercice_joueur(uuid, text, integer) from public, anon, authenticated;

-- supabase/apply/63_remplacer_mission.sql
-- Annule la mission à faire et en crée une autre, même zone. 3 remplacements / jour.
create or replace function public.remplacer_mission(p_mission_id uuid, p_exercice_id text)
returns public.missions
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  m public.missions%rowtype;
  n integer; tz text; jour date; old_exo text; old_z text;
  exo record; prevue boolean; created public.missions%rowtype;
begin
  if uid is null then raise exception 'non authentifié' using errcode = '28000'; end if;
  select * into m from public.missions where id = p_mission_id for update;
  if not found then raise exception 'mission introuvable' using errcode = 'P0002'; end if;
  if m.user_id <> uid then raise exception 'cette mission ne t''appartient pas' using errcode = '42501'; end if;
  if m.statut <> 'a_faire' then raise exception 'mission déjà validée' using errcode = '23505'; end if;
  if m.type <> 'daily' then raise exception 'exercice invalide : mission du jour seulement' using errcode = '22023'; end if;
  select timezone into tz from public.profiles where id = uid;
  jour := public.jour_local(now(), coalesce(nullif(tz, ''), 'Europe/Paris'));
  if m.date_locale <> jour then raise exception 'exercice invalide : aujourd''hui seulement' using errcode = '22023'; end if;
  select count(*) into n from public.missions
   where user_id = uid and date_locale = jour and coalesce(payload->>'source','') = 'remplacement';
  if n >= 3 then raise exception 'limite atteinte : 3 remplacements par jour' using errcode = '23505'; end if;
  old_exo := coalesce(m.payload->>'exerciceId', m.payload #>> '{exerciceIds,0}');
  select x.focus_id into old_z from public._exercice_joueur(uid, old_exo, m.duree_min) x;
  select * into exo from public._exercice_joueur(uid, p_exercice_id, m.duree_min);
  if exo.focus_id is null then raise exception 'exercice invalide' using errcode = '22023'; end if;
  if exo.focus_id is distinct from old_z then raise exception 'exercice invalide : hors zone' using errcode = '22023'; end if;
  prevue := coalesce((m.payload->>'prevue')::boolean, false);
  update public.missions set statut = 'annulee',
      payload = coalesce(m.payload, '{}'::jsonb) || jsonb_build_object('remplacee', true) where id = m.id;
  insert into public.missions (
    user_id, date_locale, type, domaine, competence_id, titre, description,
    duree_min, difficulte, payload, xp_prevu, statut
  ) values (
    uid, jour, 'daily', m.domaine, m.competence_id, m.titre, m.description,
    exo.duree, exo.difficulte,
    jsonb_build_object('source','remplacement','exerciceId',p_exercice_id,'exerciceIds',jsonb_build_array(p_exercice_id),
      'focusIds',jsonb_build_array(exo.focus_id),'perso',exo.perso,'prevue',prevue,'garderPrevue',true,'remplacementDu',m.id::text),
    public.calculer_xp_mission(exo.duree, exo.difficulte, prevue, exo.perso, null,
      public.chaine_jours_of(uid, coalesce(nullif(tz,''),'Europe/Paris'), jour)),
    'a_faire'
  ) returning * into created;
  update public.missions
     set payload = created.payload || jsonb_build_object('prevue', prevue, 'perso', exo.perso),
         xp_prevu = public.calculer_xp_mission(exo.duree, exo.difficulte, prevue, exo.perso, null,
           public.chaine_jours_of(uid, coalesce(nullif(tz,''),'Europe/Paris'), jour))
   where id = created.id returning * into created;
  return created;
end;
$$;

-- supabase/apply/64_grant_remplacer.sql
revoke all on function public.remplacer_mission(uuid, text) from public, anon;
grant execute on function public.remplacer_mission(uuid, text) to authenticated;

