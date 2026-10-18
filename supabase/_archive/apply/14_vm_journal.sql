-- _vm_journal (interne à validate_mission) : écrit le System Log de la validation.
create or replace function public._vm_journal(
  p_uid uuid,
  p_mission_id uuid,
  p_ressenti text,
  p_domaine text,
  p_xp integer,
  p_plafond text,
  p_niveau_avant integer,
  p_niveau_apres integer
)
returns void
language plpgsql
set search_path = public
as $$
declare
  rang_avant text := public.rang_depuis_niveau(p_niveau_avant);
  rang_apres text := public.rang_depuis_niveau(p_niveau_apres);
begin
  insert into public.system_log (user_id, type, payload)
  values (
    p_uid,
    'mission_validee',
    jsonb_build_object('missionId', p_mission_id, 'ressenti', p_ressenti, 'domaine', p_domaine)
  );

  if p_xp > 0 then
    insert into public.system_log (user_id, type, payload)
    values (
      p_uid,
      'xp_gagnee',
      jsonb_build_object('missionId', p_mission_id, 'xp', p_xp, 'plafond', p_plafond)
    );
  end if;

  if p_niveau_apres > p_niveau_avant then
    insert into public.system_log (user_id, type, payload)
    values (
      p_uid,
      'niveau_gagne',
      jsonb_build_object('missionId', p_mission_id, 'de', p_niveau_avant, 'vers', p_niveau_apres)
    );
  end if;

  if rang_apres is distinct from rang_avant then
    insert into public.system_log (user_id, type, payload)
    values (
      p_uid,
      'rang_obtenu',
      jsonb_build_object('missionId', p_mission_id, 'de', rang_avant, 'vers', rang_apres)
    );
  end if;
end;
$$;

revoke all on function public._vm_journal(uuid, uuid, text, text, integer, text, integer, integer)
  from public, anon, authenticated;
