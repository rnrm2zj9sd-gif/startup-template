-- Recharge PostgREST puis vérifie les bornes 1–5 sur user_skill_choices.
notify pgrst, 'reload schema';

select * from (values
  ('fonction', '_skill_choices_limites SECURITY DEFINER, search_path fixé',
    exists (select 1 from pg_proc where oid = 'public._skill_choices_limites()'::regprocedure
             and prosecdef and proconfig @> array['search_path=public'])),
  ('trigger', 'skill_choices_limites_ins BEFORE INSERT',
    exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
             where c.relname = 'user_skill_choices' and t.tgname = 'skill_choices_limites_ins'
               and not t.tgisinternal and t.tgenabled = 'O')),
  ('trigger', 'skill_choices_limites_del BEFORE DELETE',
    exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
             where c.relname = 'user_skill_choices' and t.tgname = 'skill_choices_limites_del'
               and not t.tgisinternal and t.tgenabled = 'O')),
  ('droit', '_skill_choices_limites non exécutable par authenticated',
    not has_function_privilege('authenticated', 'public._skill_choices_limites()', 'EXECUTE')),
  ('rls', 'user_skill_choices : RLS active',
    (select relrowsecurity from pg_class where oid = 'public.user_skill_choices'::regclass))
) as v(type, nom, present);
