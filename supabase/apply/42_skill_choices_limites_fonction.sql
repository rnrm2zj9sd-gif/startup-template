-- 1 à 5 compétences actives par joueur (user_skill_choices). auth.uid() nul : scripts.
create or replace function public._skill_choices_limites()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  nb integer;
  cible uuid;
begin
  if uid is null then
    return coalesce(new, old);
  end if;

  cible := coalesce(new.user_id, old.user_id);
  if cible is distinct from uid then
    return coalesce(new, old);
  end if;

  select count(*) into nb
  from public.user_skill_choices
  where user_id = uid;

  -- Upsert d'une compétence déjà active : le BEFORE INSERT voit encore la ligne.
  if tg_op = 'INSERT'
     and not exists (
       select 1 from public.user_skill_choices
       where user_id = uid and competence_id = new.competence_id
     )
     and nb >= 5 then
    raise exception 'limite atteinte : 5 compétences actives' using errcode = '22023';
  end if;
  if tg_op = 'DELETE' and nb <= 1 then
    raise exception 'il te faut au moins une compétence' using errcode = '22023';
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function public._skill_choices_limites() from public, anon, authenticated;
