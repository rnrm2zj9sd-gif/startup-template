-- Branche 1–5 compétences actives (rejouable).
drop trigger if exists skill_choices_limites_ins on public.user_skill_choices;
create trigger skill_choices_limites_ins
  before insert on public.user_skill_choices
  for each row
  execute function public._skill_choices_limites();

drop trigger if exists skill_choices_limites_del on public.user_skill_choices;
create trigger skill_choices_limites_del
  before delete on public.user_skill_choices
  for each row
  execute function public._skill_choices_limites();
