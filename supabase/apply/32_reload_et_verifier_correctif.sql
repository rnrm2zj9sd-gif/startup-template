-- Recharge le cache PostgREST puis vérifie le correctif « missions non modifiables par le client ».
notify pgrst, 'reload schema';

select * from (values
  ('droit', 'authenticated sans UPDATE sur missions',
    not has_table_privilege('authenticated', 'public.missions', 'UPDATE')),
  ('droit', 'anon sans UPDATE sur missions',
    not has_table_privilege('anon', 'public.missions', 'UPDATE')),
  ('droit', 'authenticated garde SELECT et INSERT sur missions',
    has_table_privilege('authenticated', 'public.missions', 'SELECT')
    and has_table_privilege('authenticated', 'public.missions', 'INSERT')),
  ('policy', 'missions_update_own retirée',
    not exists (select 1 from pg_policies where schemaname = 'public'
                 and tablename = 'missions' and policyname = 'missions_update_own')),
  ('fonction', 'reporter_mission SECURITY DEFINER',
    exists (select 1 from pg_proc where oid = 'public.reporter_mission(uuid)'::regprocedure and prosecdef)),
  ('fonction', 'reporter_mission search_path fixé',
    exists (select 1 from pg_proc where oid = 'public.reporter_mission(uuid)'::regprocedure
             and proconfig @> array['search_path=public'])),
  ('droit', 'reporter_mission exécutable par authenticated',
    has_function_privilege('authenticated', 'public.reporter_mission(uuid)', 'EXECUTE')),
  ('droit', 'reporter_mission non exécutable par anon',
    not has_function_privilege('anon', 'public.reporter_mission(uuid)', 'EXECUTE')),
  ('droit', 'reporter_mission retirée à public',
    not exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                 where p.oid = 'public.reporter_mission(uuid)'::regprocedure
                   and a.grantee = 0 and a.privilege_type = 'EXECUTE')),
  ('fonction', 'validate_mission toujours SECURITY DEFINER',
    exists (select 1 from pg_proc where oid = 'public.validate_mission(uuid, text, text)'::regprocedure and prosecdef))
) as v(type, nom, present);
