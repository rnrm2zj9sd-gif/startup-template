-- THEMILION SYSTEM — lot 2 / fichier 3
-- Coller dans Supabase → SQL Editor → New query, puis Run.
-- Relançable : create or replace + drop trigger if exists.

-- ---------------------------------------------------------------------------
-- Profil créé automatiquement à l’inscription
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, pseudo, timezone, onboarding_done, is_admin)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'pseudo'), ''),
      split_part(new.email, '@', 1),
      'joueur'
    ),
    'Europe/Paris',
    false,
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- profiles.is_admin : jamais modifiable par un utilisateur connecté
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_admin()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.is_admin := false;
    end if;
    return new;
  end if;

  if new.is_admin is distinct from old.is_admin then
    if auth.uid() is not null then
      raise exception 'is_admin ne peut pas être modifié';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_admin on public.profiles;
create trigger protect_profile_admin
  before insert or update on public.profiles
  for each row execute procedure public.protect_profile_admin();

-- ---------------------------------------------------------------------------
-- xp_ledger : aucun UPDATE (append-only).
-- DELETE autorisé uniquement pour le cascade auth.users → pas de trigger DELETE.
-- ---------------------------------------------------------------------------
create or replace function public.forbid_xp_ledger_update()
returns trigger
language plpgsql
as $$
begin
  raise exception 'xp_ledger est append-only';
end;
$$;

drop trigger if exists xp_ledger_no_update on public.xp_ledger;
create trigger xp_ledger_no_update
  before update on public.xp_ledger
  for each row execute procedure public.forbid_xp_ledger_update();
