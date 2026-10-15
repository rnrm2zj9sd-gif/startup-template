-- Instant du dernier changement de fuseau. Le client n'a pas le droit UPDATE sur cette colonne
-- (revoke table + grant ciblé déjà en place : la nouvelle colonne n'est pas accordée).
alter table public.profiles
  add column if not exists timezone_changed_at timestamptz;

comment on column public.profiles.timezone_changed_at is
  'Dernier changement de fuseau. Premier changement libre ; 7 jours ensuite.';
