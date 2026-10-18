-- Tables, colonnes, contraintes, index. Rejouable. Ne droppe aucune table.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  pseudo text not null default '',
  timezone text not null default 'Europe/Paris',
  onboarding_done boolean not null default false,
  birth_year integer,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists gender text not null default 'male';
alter table public.profiles add column if not exists initiation jsonb;
alter table public.profiles add column if not exists timezone_changed_at timestamptz;
do $$ begin
  alter table public.profiles add constraint profiles_gender_check check (gender in ('male', 'female'));
exception when duplicate_object then null; end $$;

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  titre text not null,
  description text not null default '',
  categorie text not null,
  date_cible date,
  statut text not null default 'a_demarrer',
  created_at timestamptz not null default now()
);
do $$ begin
  alter table public.goals add constraint goals_categorie_check check (categorie in (
    'Business', 'Finance', 'Études', 'Sport', 'Santé', 'Discipline', 'Social', 'Développement personnel'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.goals add constraint goals_statut_check check (statut in ('a_demarrer', 'en_cours', 'termine', 'archive'));
exception when duplicate_object then null; end $$;

create table if not exists public.user_skill_choices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  competence_id text not null,
  focus_ids text[] not null default '{}',
  seances_semaine integer not null default 3,
  minutes_max integer not null default 30,
  mode text not null default 'guide'
);
alter table public.user_skill_choices add column if not exists mode_en_vigueur text not null default 'guide';
alter table public.user_skill_choices add column if not exists mode_depuis date not null default current_date;
create unique index if not exists user_skill_choices_user_competence_uidx
  on public.user_skill_choices (user_id, competence_id);
do $$ begin
  alter table public.user_skill_choices add constraint user_skill_choices_mode_check
    check (mode in ('guide', 'mixte', 'libre'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.user_skill_choices add constraint user_skill_choices_mode_en_vigueur_check
    check (mode_en_vigueur in ('guide', 'mixte', 'libre'));
exception when duplicate_object then null; end $$;

create table if not exists public.custom_catalog (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb
);

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
  goal_id uuid references public.goals (id) on delete set null,
  created_at timestamptz not null default now()
);
do $$ begin
  alter table public.missions add constraint missions_type_check
    check (type in ('daily', 'weekly', 'main', 'side', 'first'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.missions add constraint missions_domaine_check
    check (domaine in ('finance', 'mind', 'health', 'fitness', 'discipline', 'life'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.missions add constraint missions_statut_check
    check (statut in ('a_faire', 'terminee', 'annulee'));
exception when duplicate_object then null; end $$;
create index if not exists missions_user_date_idx on public.missions (user_id, date_locale);
-- Une séance moteur par compétence et par jour.
-- « libre » (ajoutée à la main) et « depart » (tirage du catalogue) peuvent se cumuler.
drop index if exists public.missions_user_date_competence_daily_uidx;
create unique index if not exists missions_user_date_competence_daily_uidx
  on public.missions (user_id, date_locale, competence_id)
  where type = 'daily'
    and statut <> 'annulee'
    and coalesce(payload->>'source', '') not in ('libre', 'depart');
create unique index if not exists missions_user_first_uidx on public.missions (user_id) where type = 'first';

create table if not exists public.mission_validations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mission_id uuid not null references public.missions (id) on delete cascade,
  ressenti text not null default '',
  note text not null default '',
  validated_at timestamptz not null default now()
);
create unique index if not exists mission_validations_mission_uidx on public.mission_validations (mission_id);

create table if not exists public.skill_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  competence_id text not null,
  focus_id text not null,
  niveau integer not null default 1,
  palier integer not null default 0
);
create unique index if not exists skill_progress_user_competence_focus_uidx
  on public.skill_progress (user_id, competence_id, focus_id);

create table if not exists public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mission_id uuid references public.missions (id) on delete set null,
  montant integer not null,
  raison text not null default '',
  domaine text not null,
  created_at timestamptz not null default now()
);
do $$ begin
  alter table public.xp_ledger add constraint xp_ledger_montant_check check (montant > 0);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.xp_ledger add constraint xp_ledger_domaine_check
    check (domaine in ('finance', 'mind', 'health', 'fitness', 'discipline', 'life'));
exception when duplicate_object then null; end $$;
create index if not exists xp_ledger_user_created_idx on public.xp_ledger (user_id, created_at);
-- Une mission ne peut créditer l'XP qu'une fois (validate_mission + _vm_rejeu).
create unique index if not exists xp_ledger_mission_uidx
  on public.xp_ledger (mission_id)
  where mission_id is not null;

-- Planning : créneaux horaires. L'XP des tâches productives passe par missions + validate_mission.
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  titre text not null,
  description text not null default '',
  kind text not null,
  domaine text,
  difficulte text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  statut text not null default 'planifiee',
  mission_id uuid references public.missions (id) on delete set null,
  xp_prevu integer not null default 0,
  xp_gagne integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
do $$ begin
  alter table public.calendar_events add constraint calendar_events_kind_check
    check (kind in ('productive', 'personnel', 'pause'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.calendar_events add constraint calendar_events_statut_check
    check (statut in ('planifiee', 'en_cours', 'terminee', 'reportee', 'annulee'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.calendar_events add constraint calendar_events_domaine_check
    check (domaine is null or domaine in ('finance', 'mind', 'health', 'fitness', 'discipline', 'life'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.calendar_events add constraint calendar_events_difficulte_check
    check (difficulte is null or difficulte in ('facile', 'moyen', 'difficile'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.calendar_events add constraint calendar_events_plage_check
    check (end_at > start_at);
exception when duplicate_object then null; end $$;
create index if not exists calendar_events_user_start_idx on public.calendar_events (user_id, start_at);
create unique index if not exists calendar_events_mission_uidx
  on public.calendar_events (mission_id)
  where mission_id is not null;

create table if not exists public.system_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists system_log_user_created_idx on public.system_log (user_id, created_at);

create table if not exists public.achievements (
  id text primary key,
  titre text not null,
  condition text not null default ''
);
create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_id text not null references public.achievements (id) on delete cascade,
  unlocked_at timestamptz not null default now()
);
create unique index if not exists user_achievements_user_achievement_uidx
  on public.user_achievements (user_id, achievement_id);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stripe_customer_id text,
  statut text,
  plan text,
  current_period_end timestamptz
);
create unique index if not exists subscriptions_user_uidx on public.subscriptions (user_id);

create table if not exists public.daily_runs (
  user_id uuid not null references auth.users (id) on delete cascade,
  date_locale date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, date_locale)
);

create table if not exists public.catalogue_officiel (
  exercice_id text primary key,
  competence_id text not null,
  focus_id text not null,
  duree_min integer not null,
  duree_max integer not null,
  difficulte text not null,
  niveau integer not null
);
do $$ begin
  alter table public.catalogue_officiel add constraint catalogue_officiel_duree_check
    check (duree_min >= 2 and duree_max >= duree_min and duree_max <= 60);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.catalogue_officiel add constraint catalogue_officiel_difficulte_check
    check (difficulte in ('facile', 'moyen', 'difficile'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.catalogue_officiel add constraint catalogue_officiel_niveau_check
    check (niveau between 1 and 5);
exception when duplicate_object then null; end $$;

create table if not exists public.exercice_prefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercice_id text not null,
  kind text not null
);
do $$ begin
  alter table public.exercice_prefs add constraint exercice_prefs_kind_check
    check (kind in ('epingle', 'masque'));
exception when duplicate_object then null; end $$;
create unique index if not exists exercice_prefs_user_exo_uidx on public.exercice_prefs (user_id, exercice_id);
create index if not exists exercice_prefs_user_idx on public.exercice_prefs (user_id);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  username text,
  class text,
  rank text default 'D',
  level integer default 1,
  xp integer default 0,
  created_at timestamp default now()
);
create table if not exists public.progress (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players (id) on delete cascade,
  xp integer,
  level integer,
  discipline_score integer,
  created_at timestamp default now()
);
create table if not exists public.stats (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players (id) on delete cascade,
  business integer default 0,
  discipline integer default 0,
  intelligence integer default 0,
  health integer default 0,
  social integer default 0,
  creativity integer default 0
);
create table if not exists public.level_thresholds (
  level integer primary key,
  xp_total integer not null,
  rank character(1) not null
);
create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null,
  quest_id uuid,
  domain text,
  base_xp integer not null,
  xp_awarded integer not null,
  created_at timestamptz not null default now()
);
do $$ begin
  alter table public.xp_events add constraint xp_events_source_check
    check (source in ('quest', 'trial', 'onboarding'));
exception when duplicate_object then null; end $$;
