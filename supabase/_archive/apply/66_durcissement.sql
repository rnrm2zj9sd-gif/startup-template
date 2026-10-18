-- search_path figé + droits : anon sans tables, authenticated sans TRUNCATE/TRIGGER/REFERENCES.
alter function public.protect_profile_admin() set search_path = public, pg_temp;
alter function public.forbid_xp_ledger_update() set search_path = public, pg_temp;
alter function public.xp_total_of(uuid) set search_path = public, pg_temp;
alter function public.chaine_jours_of(uuid, text, date) set search_path = public, pg_temp;
alter function public.chaine_affichage_of(uuid, text, date) set search_path = public, pg_temp;
alter function public.niveau_depuis_xp(integer) set search_path = public, pg_temp;
alter function public.jour_local(timestamptz, text) set search_path = public, pg_temp;
alter function public.calculer_xp_mission(integer, text, boolean, boolean, numeric, integer)
  set search_path = public, pg_temp;

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke all on table public.%I from anon', t);
    execute format('revoke truncate, trigger, references on table public.%I from authenticated', t);
  end loop;
end $$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.handle_new_user() to supabase_auth_admin;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

notify pgrst, 'reload schema';

select * from (values
  ('courbe', 'xp_pour_niveau(1)=40', public.xp_pour_niveau(1) = 40),
  ('courbe', 'xp_pour_niveau(10)=247', public.xp_pour_niveau(10) = 247),
  ('rang', 'rang(9)=E', public.rang_depuis_niveau(9) = 'E'),
  ('rang', 'rang(10)=D', public.rang_depuis_niveau(10) = 'D'),
  ('rang', 'rang(100)=S', public.rang_depuis_niveau(100) = 'S'),
  ('fonction', 'xp_seuil_niveau',
    exists (select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'xp_seuil_niveau'))
) as v(type, nom, present);
