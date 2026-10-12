-- THEMILION SYSTEM — lot 2 / fichier 1
-- Coller dans Supabase → SQL Editor → New query, puis Run.
-- Relançable : ne casse pas si les tables existent déjà.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles (id = auth.uid())
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  pseudo text not null default '',
  timezone text not null default 'Europe/Paris',
  onboarding_done boolean not null default false,
  birth_year integer,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists pseudo text not null default '';
alter table public.profiles add column if not exists timezone text not null default 'Europe/Paris';
alter table public.profiles add column if not exists onboarding_done boolean not null default false;
alter table public.profiles add column if not exists birth_year integer;
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists created_at timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- goals
-- ---------------------------------------------------------------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  titre text not null,
  description text not null default '',
  categorie text not null,
  date_cible date,
  statut text not null default 'a_demarrer',
  created_at timestamptz not null default now(),
  constraint goals_categorie_check check (
    categorie in (
      'Business',
      'Finance',
      'Études',
      'Sport',
      'Santé',
      'Discipline',
      'Social',
      'Développement personnel'
    )
  ),
  constraint goals_statut_check check (
    statut in ('a_demarrer', 'en_cours', 'termine', 'archive')
  )
);

alter table public.goals add column if not exists user_id uuid;
alter table public.goals add column if not exists titre text;
alter table public.goals add column if not exists description text not null default '';
alter table public.goals add column if not exists categorie text;
alter table public.goals add column if not exists date_cible date;
alter table public.goals add column if not exists statut text not null default 'a_demarrer';
alter table public.goals add column if not exists created_at timestamptz not null default now();

do $$ begin
  alter table public.goals
    add constraint goals_categorie_check check (
      categorie in (
        'Business', 'Finance', 'Études', 'Sport', 'Santé',
        'Discipline', 'Social', 'Développement personnel'
      )
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.goals
    add constraint goals_statut_check check (
      statut in ('a_demarrer', 'en_cours', 'termine', 'archive')
    );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- user_skill_choices
-- ---------------------------------------------------------------------------
create table if not exists public.user_skill_choices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  competence_id text not null,
  focus_ids text[] not null default '{}',
  seances_semaine integer not null default 3,
  minutes_max integer not null default 30,
  mode text not null default 'guide',
  constraint user_skill_choices_mode_check check (mode in ('guide', 'mixte', 'libre'))
);

alter table public.user_skill_choices add column if not exists user_id uuid;
alter table public.user_skill_choices add column if not exists competence_id text;
alter table public.user_skill_choices add column if not exists focus_ids text[] not null default '{}';
alter table public.user_skill_choices add column if not exists seances_semaine integer not null default 3;
alter table public.user_skill_choices add column if not exists minutes_max integer not null default 30;
alter table public.user_skill_choices add column if not exists mode text not null default 'guide';

create unique index if not exists user_skill_choices_user_competence_uidx
  on public.user_skill_choices (user_id, competence_id);

do $$ begin
  alter table public.user_skill_choices
    add constraint user_skill_choices_mode_check check (mode in ('guide', 'mixte', 'libre'));
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- custom_catalog (un seul par utilisateur)
-- ---------------------------------------------------------------------------
create table if not exists public.custom_catalog (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb
);

alter table public.custom_catalog add column if not exists data jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- missions
-- ---------------------------------------------------------------------------
create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date_locale date not null,
  type text not null,
  domaine text not null,
  competence_id text not null,
  titre text not null,
  description text not null default '',
  duree_min integer not null default 0,
  difficulte text not null default 'moyen',
  payload jsonb not null default '{}'::jsonb,
  xp_prevu integer not null default 0,
  statut text not null default 'a_faire',
  goal_id uuid,
  created_at timestamptz not null default now(),
  constraint missions_type_check check (type in ('daily', 'weekly', 'main', 'side')),
  constraint missions_domaine_check check (
    domaine in ('finance', 'mind', 'health', 'fitness', 'discipline', 'life')
  ),
  constraint missions_statut_check check (statut in ('a_faire', 'terminee', 'annulee'))
);

alter table public.missions add column if not exists user_id uuid;
alter table public.missions add column if not exists date_locale date;
alter table public.missions add column if not exists type text;
alter table public.missions add column if not exists domaine text;
alter table public.missions add column if not exists competence_id text;
alter table public.missions add column if not exists titre text;
alter table public.missions add column if not exists description text not null default '';
alter table public.missions add column if not exists duree_min integer not null default 0;
alter table public.missions add column if not exists difficulte text not null default 'moyen';
alter table public.missions add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.missions add column if not exists xp_prevu integer not null default 0;
alter table public.missions add column if not exists statut text not null default 'a_faire';
alter table public.missions add column if not exists goal_id uuid;
alter table public.missions add column if not exists created_at timestamptz not null default now();

do $$ begin
  alter table public.missions
    add constraint missions_type_check check (type in ('daily', 'weekly', 'main', 'side'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.missions
    add constraint missions_domaine_check check (
      domaine in ('finance', 'mind', 'health', 'fitness', 'discipline', 'life')
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.missions
    add constraint missions_statut_check check (statut in ('a_faire', 'terminee', 'annulee'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.missions
    add constraint missions_goal_id_fkey
    foreign key (goal_id) references public.goals (id) on delete set null;
exception when duplicate_object then null;
end $$;

create index if not exists missions_user_date_idx
  on public.missions (user_id, date_locale);

-- ---------------------------------------------------------------------------
-- mission_validations (une validation par mission)
-- ---------------------------------------------------------------------------
create table if not exists public.mission_validations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mission_id uuid not null,
  ressenti text not null default '',
  note text not null default '',
  validated_at timestamptz not null default now()
);

alter table public.mission_validations add column if not exists user_id uuid;
alter table public.mission_validations add column if not exists mission_id uuid;
alter table public.mission_validations add column if not exists ressenti text not null default '';
alter table public.mission_validations add column if not exists note text not null default '';
alter table public.mission_validations add column if not exists validated_at timestamptz not null default now();

do $$ begin
  alter table public.mission_validations
    add constraint mission_validations_mission_id_fkey
    foreign key (mission_id) references public.missions (id) on delete cascade;
exception when duplicate_object then null;
end $$;

create unique index if not exists mission_validations_mission_uidx
  on public.mission_validations (mission_id);

-- ---------------------------------------------------------------------------
-- skill_progress
-- ---------------------------------------------------------------------------
create table if not exists public.skill_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  competence_id text not null,
  focus_id text not null,
  niveau integer not null default 1,
  palier integer not null default 0
);

alter table public.skill_progress add column if not exists user_id uuid;
alter table public.skill_progress add column if not exists competence_id text;
alter table public.skill_progress add column if not exists focus_id text;
alter table public.skill_progress add column if not exists niveau integer not null default 1;
alter table public.skill_progress add column if not exists palier integer not null default 0;

create unique index if not exists skill_progress_user_competence_focus_uidx
  on public.skill_progress (user_id, competence_id, focus_id);

-- ---------------------------------------------------------------------------
-- xp_ledger (append-only)
-- ---------------------------------------------------------------------------
create table if not exists public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mission_id uuid,
  montant integer not null,
  raison text not null default '',
  domaine text not null,
  created_at timestamptz not null default now(),
  constraint xp_ledger_montant_check check (montant > 0),
  constraint xp_ledger_domaine_check check (
    domaine in ('finance', 'mind', 'health', 'fitness', 'discipline', 'life')
  )
);

alter table public.xp_ledger add column if not exists user_id uuid;
alter table public.xp_ledger add column if not exists mission_id uuid;
alter table public.xp_ledger add column if not exists montant integer;
alter table public.xp_ledger add column if not exists raison text not null default '';
alter table public.xp_ledger add column if not exists domaine text;
alter table public.xp_ledger add column if not exists created_at timestamptz not null default now();

do $$ begin
  alter table public.xp_ledger
    add constraint xp_ledger_montant_check check (montant > 0);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.xp_ledger
    add constraint xp_ledger_domaine_check check (
      domaine in ('finance', 'mind', 'health', 'fitness', 'discipline', 'life')
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.xp_ledger
    add constraint xp_ledger_mission_id_fkey
    foreign key (mission_id) references public.missions (id) on delete set null;
exception when duplicate_object then null;
end $$;

create index if not exists xp_ledger_user_created_idx
  on public.xp_ledger (user_id, created_at);

-- ---------------------------------------------------------------------------
-- system_log
-- ---------------------------------------------------------------------------
create table if not exists public.system_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.system_log add column if not exists user_id uuid;
alter table public.system_log add column if not exists type text;
alter table public.system_log add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.system_log add column if not exists created_at timestamptz not null default now();

create index if not exists system_log_user_created_idx
  on public.system_log (user_id, created_at);

-- ---------------------------------------------------------------------------
-- achievements (catalogue global) + user_achievements
-- ---------------------------------------------------------------------------
create table if not exists public.achievements (
  id text primary key,
  titre text not null,
  condition text not null default ''
);

alter table public.achievements add column if not exists titre text;
alter table public.achievements add column if not exists condition text not null default '';

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now()
);

alter table public.user_achievements add column if not exists user_id uuid;
alter table public.user_achievements add column if not exists achievement_id text;
alter table public.user_achievements add column if not exists unlocked_at timestamptz not null default now();

do $$ begin
  alter table public.user_achievements
    add constraint user_achievements_achievement_id_fkey
    foreign key (achievement_id) references public.achievements (id) on delete cascade;
exception when duplicate_object then null;
end $$;

create unique index if not exists user_achievements_user_achievement_uidx
  on public.user_achievements (user_id, achievement_id);

-- ---------------------------------------------------------------------------
-- subscriptions (vide pour l’instant, Stripe au lot 7)
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stripe_customer_id text,
  statut text,
  plan text,
  current_period_end timestamptz
);

alter table public.subscriptions add column if not exists user_id uuid;
alter table public.subscriptions add column if not exists stripe_customer_id text;
alter table public.subscriptions add column if not exists statut text;
alter table public.subscriptions add column if not exists plan text;
alter table public.subscriptions add column if not exists current_period_end timestamptz;

create unique index if not exists subscriptions_user_uidx
  on public.subscriptions (user_id);

-- ---------------------------------------------------------------------------
-- droits de base (RLS restreint ensuite)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
