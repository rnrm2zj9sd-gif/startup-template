-- _profiles_timezone_update : IANA uniquement (pg_timezone_names), 7 jours entre deux changements.
-- Le premier changement (timezone_changed_at nul) est libre. Même valeur = no-op.
create or replace function public._profiles_timezone_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.timezone is not distinct from old.timezone then
    return new;
  end if;

  if new.timezone is null
     or not exists (select 1 from pg_timezone_names n where n.name = new.timezone) then
    raise exception 'fuseau invalide' using errcode = '22023';
  end if;

  if old.timezone_changed_at is not null
     and old.timezone_changed_at > now() - interval '7 days' then
    raise exception 'fuseau déjà changé récemment' using errcode = '22023';
  end if;

  new.timezone_changed_at := now();
  return new;
end;
$$;

revoke all on function public._profiles_timezone_update() from public, anon, authenticated;
