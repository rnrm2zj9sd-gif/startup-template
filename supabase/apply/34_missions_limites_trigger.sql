-- Branche les limites d'insertion sur public.missions (rejouable).
drop trigger if exists missions_limites_insert on public.missions;
create trigger missions_limites_insert
  before insert on public.missions
  for each row
  execute function public._missions_limites_insert();
