-- profiles.initiation : récap de l'onboarding (compétences, zones, budget, matériel).
alter table public.profiles
  add column if not exists initiation jsonb;
