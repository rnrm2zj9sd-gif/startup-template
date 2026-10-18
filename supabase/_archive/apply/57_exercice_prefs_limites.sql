-- 50 préférences maximum par joueur. auth.uid() nul : scripts.
create or replace function public._exercice_prefs_limites()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  n integer;
begin
  if uid is null then
    return new;
  end if;
  if new.user_id is distinct from uid then
    raise exception 'interdit' using errcode = '42501';
  end if;
  select count(*) into n from public.exercice_prefs where user_id = uid;
  if tg_op = 'INSERT' and n >= 50 then
    raise exception 'limite atteinte : 50 préférences' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function public._exercice_prefs_limites() from public, anon, authenticated;
