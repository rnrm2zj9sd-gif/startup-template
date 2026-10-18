notify pgrst, 'reload schema';

select * from (values
  ('colonne', 'user_skill_choices.mode_en_vigueur',
    exists (select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'user_skill_choices' and column_name = 'mode_en_vigueur')),
  ('table', 'exercice_prefs',
    exists (select 1 from pg_class where oid = 'public.exercice_prefs'::regclass)),
  ('rls', 'exercice_prefs : RLS own',
    (select relrowsecurity from pg_class where oid = 'public.exercice_prefs'::regclass)
    and has_table_privilege('authenticated', 'public.exercice_prefs', 'SELECT')),
  ('trigger', 'exercice_prefs_limites',
    exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
            where c.relname = 'exercice_prefs' and t.tgname = 'exercice_prefs_limites' and not t.tgisinternal)),
  ('trigger', 'skill_choices_mode_demain',
    exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
            where c.relname = 'user_skill_choices' and t.tgname = 'skill_choices_mode_demain' and not t.tgisinternal)),
  ('fonction', 'remplacer_mission exécutable authenticated',
    has_function_privilege('authenticated', 'public.remplacer_mission(uuid, text)', 'EXECUTE')),
  ('fonction', 'appliquer_modes_du_jour exécutable authenticated',
    has_function_privilege('authenticated', 'public.appliquer_modes_du_jour()', 'EXECUTE'))
) as v(type, nom, present);
