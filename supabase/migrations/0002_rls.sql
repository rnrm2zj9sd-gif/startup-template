-- THEMILION SYSTEM — lot 2 / fichier 2
-- Coller dans Supabase → SQL Editor → New query, puis Run.
-- Relançable : drop policy if exists avant chaque create.

-- ---------------------------------------------------------------------------
-- Activer RLS partout
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.user_skill_choices enable row level security;
alter table public.custom_catalog enable row level security;
alter table public.missions enable row level security;
alter table public.mission_validations enable row level security;
alter table public.skill_progress enable row level security;
alter table public.xp_ledger enable row level security;
alter table public.system_log enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.subscriptions enable row level security;

-- is_admin : l’utilisateur ne peut pas le modifier (colonnes autorisées seulement)
revoke update on table public.profiles from anon, authenticated;
grant update (pseudo, timezone, onboarding_done, birth_year) on table public.profiles to authenticated;

-- xp_ledger : aucun UPDATE / DELETE côté client (même le propriétaire)
revoke insert, update, delete on table public.xp_ledger from anon, authenticated;
grant select on table public.xp_ledger to authenticated;

revoke insert, update, delete on table public.mission_validations from anon, authenticated;
grant select on table public.mission_validations to authenticated;

revoke insert, update, delete on table public.skill_progress from anon, authenticated;
grant select on table public.skill_progress to authenticated;

revoke insert, update, delete on table public.system_log from anon, authenticated;
grant select on table public.system_log to authenticated;

revoke insert, update, delete on table public.user_achievements from anon, authenticated;
grant select on table public.user_achievements to authenticated;

revoke insert, update, delete on table public.subscriptions from anon, authenticated;
grant select on table public.subscriptions to authenticated;

revoke insert, update, delete on table public.achievements from anon, authenticated;
grant select on table public.achievements to authenticated;

-- ---------------------------------------------------------------------------
-- profiles : lecture / insert / update si id = auth.uid()
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- goals
-- ---------------------------------------------------------------------------
drop policy if exists goals_select_own on public.goals;
create policy goals_select_own on public.goals
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists goals_insert_own on public.goals;
create policy goals_insert_own on public.goals
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists goals_update_own on public.goals;
create policy goals_update_own on public.goals
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- user_skill_choices
-- ---------------------------------------------------------------------------
drop policy if exists user_skill_choices_select_own on public.user_skill_choices;
create policy user_skill_choices_select_own on public.user_skill_choices
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists user_skill_choices_insert_own on public.user_skill_choices;
create policy user_skill_choices_insert_own on public.user_skill_choices
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists user_skill_choices_update_own on public.user_skill_choices;
create policy user_skill_choices_update_own on public.user_skill_choices
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- custom_catalog
-- ---------------------------------------------------------------------------
drop policy if exists custom_catalog_select_own on public.custom_catalog;
create policy custom_catalog_select_own on public.custom_catalog
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists custom_catalog_insert_own on public.custom_catalog;
create policy custom_catalog_insert_own on public.custom_catalog
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists custom_catalog_update_own on public.custom_catalog;
create policy custom_catalog_update_own on public.custom_catalog
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- missions
-- ---------------------------------------------------------------------------
drop policy if exists missions_select_own on public.missions;
create policy missions_select_own on public.missions
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists missions_insert_own on public.missions;
create policy missions_insert_own on public.missions
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists missions_update_own on public.missions;
create policy missions_update_own on public.missions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Lecture seule : mission_validations, skill_progress, xp_ledger,
-- system_log, user_achievements, subscriptions
-- ---------------------------------------------------------------------------
drop policy if exists mission_validations_select_own on public.mission_validations;
create policy mission_validations_select_own on public.mission_validations
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists skill_progress_select_own on public.skill_progress;
create policy skill_progress_select_own on public.skill_progress
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists xp_ledger_select_own on public.xp_ledger;
create policy xp_ledger_select_own on public.xp_ledger
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists system_log_select_own on public.system_log;
create policy system_log_select_own on public.system_log
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists user_achievements_select_own on public.user_achievements;
create policy user_achievements_select_own on public.user_achievements
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated
  using (user_id = auth.uid());

-- achievements : lecture pour les utilisateurs connectés
drop policy if exists achievements_select_authenticated on public.achievements;
create policy achievements_select_authenticated on public.achievements
  for select to authenticated
  using (auth.uid() is not null);
