-- Recharge le cache PostgREST puis vérifie le schéma du lot 4 (et que le lot 3 est intact).
notify pgrst, 'reload schema';

select 'colonne' as type, c.nom, exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles' and column_name = c.nom
) as present
from unnest(array['gender', 'initiation']) as c(nom)
union all
select 'contrainte', 'profiles_gender_check',
  exists (select 1 from pg_constraint where conname = 'profiles_gender_check')
union all
select 'contrainte', 'missions_type_check accepte first',
  coalesce((select pg_get_constraintdef(oid) like '%first%' from pg_constraint where conname = 'missions_type_check'), false)
union all
select 'index', 'missions_user_first_uidx',
  exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'missions_user_first_uidx')
union all
select 'table', 'daily_runs (RLS active)',
  coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.daily_runs')), false)
union all
select 'droit', 'update profiles.gender / initiation',
  (select count(*) = 2 from information_schema.column_privileges
   where table_schema = 'public' and table_name = 'profiles' and grantee = 'authenticated'
     and privilege_type = 'UPDATE' and column_name in ('gender', 'initiation'))
union all
select 'droit', 'is_admin non modifiable',
  not exists (select 1 from information_schema.column_privileges
   where table_schema = 'public' and table_name = 'profiles' and grantee = 'authenticated'
     and privilege_type = 'UPDATE' and column_name = 'is_admin')
union all
select 'fonction', f.nom,
  exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = f.nom)
from unnest(array['handle_new_user', 'validate_mission', 'progression_snapshot']) as f(nom);
