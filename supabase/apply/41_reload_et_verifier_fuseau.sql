-- Recharge PostgREST puis vérifie fuseau IANA, cooldown 7 jours, dates d'insertion.
notify pgrst, 'reload schema';

select * from (values
  ('colonne', 'profiles.timezone_changed_at',
    exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles'
               and column_name = 'timezone_changed_at')),
  ('droit', 'authenticated sans UPDATE sur timezone_changed_at',
    not has_column_privilege('authenticated', 'public.profiles', 'timezone_changed_at', 'UPDATE')),
  ('trigger', 'profiles_timezone_update (BEFORE UPDATE)',
    exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
             where c.relname = 'profiles' and t.tgname = 'profiles_timezone_update'
               and not t.tgisinternal and t.tgenabled = 'O')),
  ('fonction', '_profiles_timezone_update SECURITY DEFINER, search_path fixé',
    exists (select 1 from pg_proc where oid = 'public._profiles_timezone_update()'::regprocedure
             and prosecdef and proconfig @> array['search_path=public'])),
  ('iana', 'Europe/Paris dans pg_timezone_names, UTC-9:40 absent',
    exists (select 1 from pg_timezone_names where name = 'Europe/Paris')
    and not exists (select 1 from pg_timezone_names where name = 'UTC-9:40')),
  ('insert', '_missions_limites_insert borne aujourd''hui ou demain',
    (select prosrc from pg_proc where oid = 'public._missions_limites_insert()'::regprocedure)
      like '%date invalide%'),
  ('valider', '_vm_verrouiller refuse au-delà de demain',
    (select prosrc from pg_proc where oid = 'public._vm_verrouiller(uuid,uuid,text)'::regprocedure)
      like '%mission trop lointaine%'),
  ('droit', 'authenticated garde UPDATE sur timezone',
    has_column_privilege('authenticated', 'public.profiles', 'timezone', 'UPDATE'))
) as v(type, nom, present);
