-- Recharge PostgREST puis vérifie le catalogue et les triggers du lot 6A.
notify pgrst, 'reload schema';

select * from (values
  ('table', 'catalogue_officiel',
    exists (select 1 from pg_class where oid = 'public.catalogue_officiel'::regclass)),
  ('lignes', 'catalogue_officiel alimenté',
    (select count(*) > 0 from public.catalogue_officiel)),
  ('rls', 'catalogue_officiel : RLS, lecture seule authenticated',
    (select relrowsecurity from pg_class where oid = 'public.catalogue_officiel'::regclass)
    and has_table_privilege('authenticated', 'public.catalogue_officiel', 'SELECT')
    and not has_table_privilege('authenticated', 'public.catalogue_officiel', 'INSERT')),
  ('trigger', 'custom_catalog_limites',
    exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
            where c.relname = 'custom_catalog' and t.tgname = 'custom_catalog_limites' and not t.tgisinternal)),
  ('fonction', '_mission_lier_exercice non exécutable',
    not has_function_privilege('authenticated', 'public._mission_lier_exercice(uuid, date, integer, text, text, jsonb)', 'EXECUTE')),
  ('trigger', 'missions_limites_insert toujours là',
    exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
            where c.relname = 'missions' and t.tgname = 'missions_limites_insert' and not t.tgisinternal))
) as v(type, nom, present);
