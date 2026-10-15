-- THEMILION SYSTEM — lot 4 / schéma : personnage, initiation, première victoire, Daily System.
-- Source de vérité : supabase/apply/23_ à 28_ (même contenu, appliqué avec pnpm db:apply).
-- Relançable. Ne touche pas aux migrations 0000 à 0005 ni à la logique du lot 3.

-- profiles.gender : genre du personnage (male | female), choisi à l'onboarding.
alter table public.profiles
  add column if not exists gender text not null default 'male';

do $$ begin
  alter table public.profiles
    add constraint profiles_gender_check check (gender in ('male', 'female'));
exception when duplicate_object then null;
end $$;

-- profiles.initiation : récap de l'onboarding (compétences, zones, budget, matériel).
alter table public.profiles
  add column if not exists initiation jsonb;

-- profiles : colonnes modifiables par le joueur (is_admin reste protégé).
revoke update on table public.profiles from anon, authenticated;
grant update (pseudo, timezone, onboarding_done, birth_year, gender, initiation)
  on table public.profiles to authenticated;

-- handle_new_user : profil créé à l'inscription, avec le genre lu dans les métadonnées.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  g text;
begin
  g := lower(trim(coalesce(new.raw_user_meta_data->>'gender', '')));
  if g not in ('male', 'female') then
    g := 'male';
  end if;

  insert into public.profiles (id, pseudo, timezone, onboarding_done, is_admin, gender)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'pseudo'), ''),
      split_part(new.email, '@', 1),
      'joueur'
    ),
    'Europe/Paris',
    false,
    false,
    g
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- missions.type 'first' : la première victoire, une seule par joueur.
alter table public.missions drop constraint if exists missions_type_check;
alter table public.missions
  add constraint missions_type_check
  check (type in ('daily', 'weekly', 'main', 'side', 'first'));

create unique index if not exists missions_user_first_uidx
  on public.missions (user_id)
  where type = 'first';

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
