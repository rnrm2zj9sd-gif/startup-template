-- Recharge le cache PostgREST puis vérifie les limites d'insertion des missions.
notify pgrst, 'reload schema';

select * from (values
  ('trigger', 'missions_limites_insert (BEFORE INSERT, par ligne)',
    exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
             where c.relname = 'missions' and t.tgname = 'missions_limites_insert'
               and not t.tgisinternal and t.tgenabled = 'O')),
  ('fonction', '_missions_limites_insert SECURITY DEFINER, search_path fixé',
    exists (select 1 from pg_proc where oid = 'public._missions_limites_insert()'::regprocedure
             and prosecdef and proconfig @> array['search_path=public'])),
  ('droit', '_missions_limites_insert non exécutable par authenticated',
    not has_function_privilege('authenticated', 'public._missions_limites_insert()', 'EXECUTE')),
  ('rls', 'missions : RLS active',
    (select relrowsecurity from pg_class where oid = 'public.missions'::regclass)),
  ('rls', 'missions_insert_own impose user_id = auth.uid()',
    exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'missions'
             and policyname = 'missions_insert_own' and cmd = 'INSERT'
             and with_check ~ 'user_id = auth\.uid\(\)')),
  ('rls', 'aucune autre policy d''INSERT sur missions',
    (select count(*) = 1 from pg_policies where schemaname = 'public' and tablename = 'missions'
       and cmd in ('INSERT', 'ALL'))),
  ('droit', 'authenticated toujours sans UPDATE sur missions',
    not has_table_privilege('authenticated', 'public.missions', 'UPDATE')),
  ('info', 'fuseau POSIX arbitraire accepté par at time zone (risque plafond)',
    extract(minute from ('2026-10-15 22:30:00+00'::timestamptz at time zone 'UTC-5:17')) in (13, 47))
) as v(type, nom, present);
