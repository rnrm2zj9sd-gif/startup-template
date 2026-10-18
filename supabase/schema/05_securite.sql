-- RLS, policies, droits, durcissement. Toujours en dernier.
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
alter table public.daily_runs enable row level security;
alter table public.catalogue_officiel enable row level security;
alter table public.exercice_prefs enable row level security;
alter table public.calendar_events enable row level security;

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke all on table public.%I from anon', t);
    execute format('revoke truncate, trigger, references on table public.%I from authenticated', t);
  end loop;
end $$;

grant select, insert, delete on table public.profiles to authenticated;
revoke update on table public.profiles from anon, authenticated;
grant update (pseudo, timezone, onboarding_done, birth_year, gender, initiation)
  on table public.profiles to authenticated;

grant select, insert, update, delete on table public.goals to authenticated;
grant select, delete on table public.user_skill_choices to authenticated;
revoke insert, update on table public.user_skill_choices from public, anon, authenticated;
grant insert (id, user_id, competence_id, focus_ids, seances_semaine, minutes_max, mode)
  on table public.user_skill_choices to authenticated;
grant update (competence_id, focus_ids, seances_semaine, minutes_max, mode)
  on table public.user_skill_choices to authenticated;

grant select, insert, update, delete on table public.custom_catalog to authenticated;
grant select, insert, delete on table public.missions to authenticated;
revoke update on table public.missions from anon, authenticated;
grant select on table public.mission_validations to authenticated;
grant select on table public.skill_progress to authenticated;
grant select on table public.xp_ledger to authenticated;
grant select on table public.system_log to authenticated;
grant select on table public.achievements to authenticated;
grant select on table public.user_achievements to authenticated;
grant select on table public.subscriptions to authenticated;
grant select, insert on table public.daily_runs to authenticated;
grant select on table public.catalogue_officiel to authenticated;
grant select, insert, update, delete on table public.exercice_prefs to authenticated;
grant select, insert, delete on table public.calendar_events to authenticated;
revoke update on table public.calendar_events from anon, authenticated;
grant update (titre, description, kind, domaine, difficulte, start_at, end_at, xp_prevu)
  on table public.calendar_events to authenticated;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists goals_select_own on public.goals;
create policy goals_select_own on public.goals for select to authenticated using (user_id = auth.uid());
drop policy if exists goals_insert_own on public.goals;
create policy goals_insert_own on public.goals for insert to authenticated with check (user_id = auth.uid());
drop policy if exists goals_update_own on public.goals;
create policy goals_update_own on public.goals for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists user_skill_choices_select_own on public.user_skill_choices;
create policy user_skill_choices_select_own on public.user_skill_choices for select to authenticated using (user_id = auth.uid());
drop policy if exists user_skill_choices_insert_own on public.user_skill_choices;
create policy user_skill_choices_insert_own on public.user_skill_choices for insert to authenticated with check (user_id = auth.uid());
drop policy if exists user_skill_choices_update_own on public.user_skill_choices;
create policy user_skill_choices_update_own on public.user_skill_choices for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists user_skill_choices_delete_own on public.user_skill_choices;
create policy user_skill_choices_delete_own on public.user_skill_choices for delete to authenticated using (user_id = auth.uid());

drop policy if exists custom_catalog_select_own on public.custom_catalog;
create policy custom_catalog_select_own on public.custom_catalog for select to authenticated using (user_id = auth.uid());
drop policy if exists custom_catalog_insert_own on public.custom_catalog;
create policy custom_catalog_insert_own on public.custom_catalog for insert to authenticated with check (user_id = auth.uid());
drop policy if exists custom_catalog_update_own on public.custom_catalog;
create policy custom_catalog_update_own on public.custom_catalog for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists missions_select_own on public.missions;
create policy missions_select_own on public.missions for select to authenticated using (user_id = auth.uid());
drop policy if exists missions_insert_own on public.missions;
create policy missions_insert_own on public.missions for insert to authenticated with check (user_id = auth.uid());
drop policy if exists missions_update_own on public.missions;

drop policy if exists mission_validations_select_own on public.mission_validations;
create policy mission_validations_select_own on public.mission_validations for select to authenticated using (user_id = auth.uid());
drop policy if exists skill_progress_select_own on public.skill_progress;
create policy skill_progress_select_own on public.skill_progress for select to authenticated using (user_id = auth.uid());
drop policy if exists xp_ledger_select_own on public.xp_ledger;
create policy xp_ledger_select_own on public.xp_ledger for select to authenticated using (user_id = auth.uid());
drop policy if exists system_log_select_own on public.system_log;
create policy system_log_select_own on public.system_log for select to authenticated using (user_id = auth.uid());
drop policy if exists achievements_select_authenticated on public.achievements;
create policy achievements_select_authenticated on public.achievements for select to authenticated using (auth.uid() is not null);
drop policy if exists user_achievements_select_own on public.user_achievements;
create policy user_achievements_select_own on public.user_achievements for select to authenticated using (user_id = auth.uid());
drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions for select to authenticated using (user_id = auth.uid());
drop policy if exists daily_runs_select_own on public.daily_runs;
create policy daily_runs_select_own on public.daily_runs for select to authenticated using (user_id = auth.uid());
drop policy if exists daily_runs_insert_own on public.daily_runs;
create policy daily_runs_insert_own on public.daily_runs for insert to authenticated with check (user_id = auth.uid());
drop policy if exists catalogue_officiel_select on public.catalogue_officiel;
create policy catalogue_officiel_select on public.catalogue_officiel for select to authenticated using (true);
drop policy if exists exercice_prefs_select_own on public.exercice_prefs;
create policy exercice_prefs_select_own on public.exercice_prefs for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists exercice_prefs_insert_own on public.exercice_prefs;
create policy exercice_prefs_insert_own on public.exercice_prefs for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists exercice_prefs_update_own on public.exercice_prefs;
create policy exercice_prefs_update_own on public.exercice_prefs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists exercice_prefs_delete_own on public.exercice_prefs;
create policy exercice_prefs_delete_own on public.exercice_prefs for delete to authenticated using ((select auth.uid()) = user_id);
drop policy if exists calendar_events_select_own on public.calendar_events;
create policy calendar_events_select_own on public.calendar_events for select to authenticated using (user_id = auth.uid());
drop policy if exists calendar_events_insert_own on public.calendar_events;
create policy calendar_events_insert_own on public.calendar_events for insert to authenticated with check (user_id = auth.uid());
drop policy if exists calendar_events_update_own on public.calendar_events;
create policy calendar_events_update_own on public.calendar_events for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists calendar_events_delete_own on public.calendar_events;
create policy calendar_events_delete_own on public.calendar_events for delete to authenticated using (user_id = auth.uid());

alter function public.protect_profile_admin() set search_path = public, pg_temp;
alter function public.forbid_xp_ledger_update() set search_path = public, pg_temp;
alter function public.xp_total_of(uuid) set search_path = public, pg_temp;
alter function public.chaine_jours_of(uuid, text, date) set search_path = public, pg_temp;
alter function public.chaine_affichage_of(uuid, text, date) set search_path = public, pg_temp;
alter function public.niveau_depuis_xp(integer) set search_path = public, pg_temp;
alter function public.jour_local(timestamptz, text) set search_path = public, pg_temp;
alter function public.calculer_xp_mission(integer, text, boolean, boolean, numeric, integer)
  set search_path = public, pg_temp;

revoke all on function public.handle_new_user() from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.handle_new_user() to supabase_auth_admin;
  end if;
end $$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

revoke all on function public.rls_auto_enable() from public, anon, authenticated;

revoke all on function public._custom_catalog_limites() from public, anon, authenticated;
revoke all on function public._exercice_prefs_limites() from public, anon, authenticated;
revoke all on function public._calendar_events_limites() from public, anon, authenticated;
revoke all on function public._exercice_joueur(uuid, text, integer) from public, anon, authenticated;
revoke all on function public._mission_lier_exercice(uuid, date, integer, text, text, jsonb) from public, anon, authenticated;
revoke all on function public._missions_limites_insert() from public, anon, authenticated;
revoke all on function public._profiles_timezone_update() from public, anon, authenticated;
revoke all on function public._skill_choices_limites() from public, anon, authenticated;
revoke all on function public._skill_choices_mode_demain() from public, anon, authenticated;
revoke all on function public._vm_journal(uuid, uuid, text, text, integer, text, integer, integer) from public, anon, authenticated;
revoke all on function public._vm_progresser(uuid, text, jsonb, integer) from public, anon, authenticated;
revoke all on function public._vm_verrouiller(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public._vm_rejeu(uuid, uuid) from public, anon, authenticated;
revoke all on function public._vm_xp_credite(uuid, text, date, integer, boolean) from public, anon, authenticated;
revoke all on function public._ps_classe(uuid, text, date, integer) from public, anon, authenticated;
revoke all on function public._ps_discipline(uuid, date) from public, anon, authenticated;
revoke all on function public._ps_niveaux_domaines(jsonb) from public, anon, authenticated;
revoke all on function public._ps_power(uuid, jsonb) from public, anon, authenticated;
revoke all on function public._ps_xp_domaines(uuid) from public, anon, authenticated;
revoke all on function public.xp_total_of(uuid) from public, anon, authenticated;
revoke all on function public.chaine_jours_of(uuid, text, date) from public, anon, authenticated;
revoke all on function public.chaine_affichage_of(uuid, text, date) from public, anon, authenticated;
revoke all on function public.serie_depuis_jours(date[], date) from public, anon, authenticated;
revoke all on function public.serie_etat(uuid, text, date) from public, anon, authenticated;
revoke all on function public._serie_journal() from public, anon, authenticated;
revoke all on function public.protect_profile_admin() from public, anon, authenticated;
revoke all on function public.forbid_xp_ledger_update() from public, anon, authenticated;

revoke all on function public.jour_local(timestamptz, text) from public, anon;
grant execute on function public.jour_local(timestamptz, text) to authenticated;
revoke all on function public.xp_seuil_niveau(integer) from public, anon;
grant execute on function public.xp_seuil_niveau(integer) to authenticated;
revoke all on function public.xp_pour_niveau(integer) from public, anon;
grant execute on function public.xp_pour_niveau(integer) to authenticated;
revoke all on function public.niveau_depuis_xp(integer) from public, anon;
grant execute on function public.niveau_depuis_xp(integer) to authenticated;
revoke all on function public.rang_depuis_niveau(integer) from public, anon;
grant execute on function public.rang_depuis_niveau(integer) to authenticated;
revoke all on function public.validate_mission(uuid, text, text) from public, anon;
grant execute on function public.validate_mission(uuid, text, text) to authenticated;
revoke all on function public.reporter_mission(uuid) from public, anon;
grant execute on function public.reporter_mission(uuid) to authenticated;
revoke all on function public.remplacer_mission(uuid, text) from public, anon;
grant execute on function public.remplacer_mission(uuid, text) to authenticated;
revoke all on function public.appliquer_modes_du_jour() from public, anon;
grant execute on function public.appliquer_modes_du_jour() to authenticated;
revoke all on function public.progression_snapshot(uuid) from public, anon;
grant execute on function public.progression_snapshot(uuid) to authenticated;
revoke all on function public.terminer_evenement_calendrier(uuid, text) from public, anon;
grant execute on function public.terminer_evenement_calendrier(uuid, text) to authenticated;
revoke all on function public.reporter_evenement_calendrier(uuid) from public, anon;
grant execute on function public.reporter_evenement_calendrier(uuid) to authenticated;
revoke all on function public.annuler_evenement_calendrier(uuid) from public, anon;
grant execute on function public.annuler_evenement_calendrier(uuid) to authenticated;
revoke all on function public.demarrer_evenement_calendrier(uuid) from public, anon;
grant execute on function public.demarrer_evenement_calendrier(uuid) to authenticated;

notify pgrst, 'reload schema';

select * from (values
  ('courbe', 'xp_pour_niveau(1)=40', public.xp_pour_niveau(1) = 40),
  ('colonne', 'mode_en_vigueur', exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'user_skill_choices' and column_name = 'mode_en_vigueur')),
  ('table', 'exercice_prefs', exists (select 1 from pg_class where oid = 'public.exercice_prefs'::regclass)),
  ('fonction', 'remplacer_mission', has_function_privilege('authenticated', 'public.remplacer_mission(uuid, text)', 'EXECUTE')),
  ('droit', 'client sans mode_depuis', not has_column_privilege('authenticated', 'public.user_skill_choices', 'mode_depuis', 'UPDATE')),
  ('droit', 'client sans mode_en_vigueur', not has_column_privilege('authenticated', 'public.user_skill_choices', 'mode_en_vigueur', 'UPDATE')),
  ('index', 'mission_validations unique', exists (
    select 1 from pg_indexes
     where schemaname = 'public' and indexname = 'mission_validations_mission_uidx')),
  ('index', 'xp_ledger mission unique', exists (
    select 1 from pg_indexes
     where schemaname = 'public' and indexname = 'xp_ledger_mission_uidx')),
  ('droit', 'client sans insert xp_ledger', not has_table_privilege('authenticated', 'public.xp_ledger', 'INSERT')),
  ('droit', 'client sans insert validations', not has_table_privilege('authenticated', 'public.mission_validations', 'INSERT')),
  ('droit', '_ps_xp_domaines fermé', not has_function_privilege('authenticated', 'public._ps_xp_domaines(uuid)', 'EXECUTE')),
  ('droit', 'xp_total_of fermé', not has_function_privilege('authenticated', 'public.xp_total_of(uuid)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.xp_total_of(uuid)', 'EXECUTE')),
  ('droit', 'chaine fermée', not has_function_privilege('authenticated', 'public.chaine_jours_of(uuid, text, date)', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.chaine_affichage_of(uuid, text, date)', 'EXECUTE')),
  ('fonction', 'serie_etat', exists (select 1 from pg_proc where proname = 'serie_etat')),
  ('trigger', 'xp_ledger_serie', exists (select 1 from pg_trigger where tgname = 'xp_ledger_serie')),
  ('droit', 'serie fermée', not has_function_privilege('authenticated', 'public.serie_etat(uuid, text, date)', 'EXECUTE')),
  ('table', 'calendar_events', exists (select 1 from pg_class where oid = 'public.calendar_events'::regclass)),
  ('fonction', 'terminer_evenement_calendrier', has_function_privilege('authenticated', 'public.terminer_evenement_calendrier(uuid, text)', 'EXECUTE')),
  ('droit', 'client sans statut calendrier', not has_column_privilege('authenticated', 'public.calendar_events', 'statut', 'UPDATE')),
  ('droit', 'client sans xp_gagne calendrier', not has_column_privilege('authenticated', 'public.calendar_events', 'xp_gagne', 'UPDATE'))
) as v(type, nom, present);
