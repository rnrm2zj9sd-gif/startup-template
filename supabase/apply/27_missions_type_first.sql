-- missions.type 'first' : la première victoire, une seule par joueur.
alter table public.missions drop constraint if exists missions_type_check;
alter table public.missions
  add constraint missions_type_check
  check (type in ('daily', 'weekly', 'main', 'side', 'first'));

create unique index if not exists missions_user_first_uidx
  on public.missions (user_id)
  where type = 'first';
