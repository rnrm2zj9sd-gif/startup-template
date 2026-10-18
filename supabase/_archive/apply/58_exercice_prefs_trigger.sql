drop trigger if exists exercice_prefs_limites on public.exercice_prefs;
create trigger exercice_prefs_limites
  before insert or update on public.exercice_prefs
  for each row
  execute function public._exercice_prefs_limites();
