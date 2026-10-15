-- daily_runs : une génération Daily System par joueur et par jour local (RLS : ses lignes).
create table if not exists public.daily_runs (
  user_id uuid not null references auth.users (id) on delete cascade,
  date_locale date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, date_locale)
);

alter table public.daily_runs enable row level security;

revoke all on table public.daily_runs from anon, authenticated;
grant select, insert on table public.daily_runs to authenticated;

drop policy if exists daily_runs_select_own on public.daily_runs;
create policy daily_runs_select_own on public.daily_runs
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists daily_runs_insert_own on public.daily_runs;
create policy daily_runs_insert_own on public.daily_runs
  for insert to authenticated
  with check (user_id = auth.uid());
