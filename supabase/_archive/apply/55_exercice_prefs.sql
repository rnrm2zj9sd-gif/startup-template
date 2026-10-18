-- Préférences d'exercices (épinglé / masqué). Un exercice, un seul kind.
create table if not exists public.exercice_prefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercice_id text not null,
  kind text not null,
  constraint exercice_prefs_kind_check check (kind in ('epingle', 'masque'))
);

create unique index if not exists exercice_prefs_user_exo_uidx
  on public.exercice_prefs (user_id, exercice_id);

create index if not exists exercice_prefs_user_idx
  on public.exercice_prefs (user_id);
