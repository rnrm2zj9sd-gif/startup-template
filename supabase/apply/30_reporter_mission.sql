-- reporter_mission : reporte au lendemain (jour local du joueur) une mission du jour encore à faire.
-- Seule voie d'écriture du client sur une mission existante, avec validate_mission.
create or replace function public.reporter_mission(p_mission_id uuid)
returns public.missions
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  m public.missions%rowtype;
  tz text;
  jour date;
begin
  if uid is null then
    raise exception 'non authentifié' using errcode = '28000';
  end if;

  select * into m from public.missions where id = p_mission_id for update;
  if not found then
    raise exception 'mission introuvable' using errcode = 'P0002';
  end if;
  if m.user_id <> uid then
    raise exception 'cette mission ne t''appartient pas' using errcode = '42501';
  end if;
  if m.statut <> 'a_faire' then
    raise exception 'mission déjà validée' using errcode = '23505';
  end if;
  if m.type <> 'daily' then
    raise exception 'seule une mission du jour se reporte' using errcode = '22023';
  end if;

  select timezone into tz from public.profiles where id = uid;
  jour := public.jour_local(now(), coalesce(nullif(tz, ''), 'Europe/Paris'));
  if m.date_locale <> jour then
    raise exception 'seule une mission d''aujourd''hui se reporte' using errcode = '22023';
  end if;

  begin
    update public.missions
       set date_locale = jour + 1,
           payload = coalesce(payload, '{}'::jsonb)
                     || jsonb_build_object('reportee', true, 'reporteeDu', jour::text)
     where id = p_mission_id
    returning * into m;
  exception
    when unique_violation then
      raise exception 'Tu as déjà cette compétence demain.' using errcode = '23505';
  end;

  return m;
end;
$$;

revoke all on function public.reporter_mission(uuid) from public, anon;
grant execute on function public.reporter_mission(uuid) to authenticated;
