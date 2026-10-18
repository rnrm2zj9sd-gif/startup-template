-- _vm_verrouiller (interne à validate_mission) : contrôles d'entrée puis verrou de la mission.
create or replace function public._vm_verrouiller(p_uid uuid, p_mission_id uuid, p_ressenti text)
returns public.missions
language plpgsql
set search_path = public
as $$
declare
  m public.missions%rowtype;
begin
  if p_uid is null then
    raise exception 'non authentifié' using errcode = '28000';
  end if;

  if p_ressenti not in ('trop_facile', 'bien', 'trop_dur', 'pas_fait') then
    raise exception 'ressenti invalide' using errcode = '22023';
  end if;

  select * into m
  from public.missions
  where id = p_mission_id
  for update;

  if not found then
    raise exception 'mission introuvable' using errcode = 'P0002';
  end if;

  if m.user_id <> p_uid then
    raise exception 'cette mission ne t''appartient pas' using errcode = '42501';
  end if;

  if m.statut <> 'a_faire' then
    raise exception 'mission déjà validée' using errcode = '23505';
  end if;

  return m;
end;
$$;

revoke all on function public._vm_verrouiller(uuid, uuid, text) from public, anon, authenticated;
