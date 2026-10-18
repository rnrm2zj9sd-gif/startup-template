-- profiles : colonnes modifiables par le joueur (is_admin reste protégé).
revoke update on table public.profiles from anon, authenticated;
grant update (pseudo, timezone, onboarding_done, birth_year, gender, initiation)
  on table public.profiles to authenticated;
