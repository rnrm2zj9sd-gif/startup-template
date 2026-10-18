-- profiles.gender : genre du personnage (male | female), choisi à l'onboarding.
alter table public.profiles
  add column if not exists gender text not null default 'male';

do $$ begin
  alter table public.profiles
    add constraint profiles_gender_check check (gender in ('male', 'female'));
exception when duplicate_object then null;
end $$;
