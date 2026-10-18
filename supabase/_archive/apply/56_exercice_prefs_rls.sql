-- RLS : le joueur lit et écrit uniquement ses lignes.
alter table public.exercice_prefs enable row level security;

revoke all on table public.exercice_prefs from anon, authenticated;
grant select, insert, update, delete on table public.exercice_prefs to authenticated;

drop policy if exists exercice_prefs_select_own on public.exercice_prefs;
create policy exercice_prefs_select_own on public.exercice_prefs
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists exercice_prefs_insert_own on public.exercice_prefs;
create policy exercice_prefs_insert_own on public.exercice_prefs
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists exercice_prefs_update_own on public.exercice_prefs;
create policy exercice_prefs_update_own on public.exercice_prefs
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists exercice_prefs_delete_own on public.exercice_prefs;
create policy exercice_prefs_delete_own on public.exercice_prefs
  for delete to authenticated
  using ((select auth.uid()) = user_id);
