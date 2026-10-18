-- Un changement de mode côté joueur s'applique demain. Scripts (uid nul) : pas de délai.
create or replace function public._skill_choices_mode_demain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.mode := coalesce(new.mode, 'guide');
    new.mode_en_vigueur := coalesce(new.mode, 'guide');
    new.mode_depuis := current_date;
    return new;
  end if;
  if new.mode is distinct from old.mode then
    new.mode_en_vigueur := old.mode_en_vigueur;
    new.mode_depuis := current_date + 1;
  elsif new.mode_en_vigueur is distinct from old.mode_en_vigueur
     and (new.mode_en_vigueur is distinct from new.mode or old.mode_depuis > current_date) then
    new.mode_en_vigueur := old.mode_en_vigueur;
  end if;
  return new;
end;
$$;

revoke all on function public._skill_choices_mode_demain() from public, anon, authenticated;

drop trigger if exists skill_choices_mode_demain on public.user_skill_choices;
create trigger skill_choices_mode_demain
  before insert or update on public.user_skill_choices
  for each row
  execute function public._skill_choices_mode_demain();
