-- validate_mission : valide une mission en une transaction (XP, statut, paliers, System Log).
create or replace function public.validate_mission(
  p_mission_id uuid,
  p_ressenti text default 'bien',
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  m public.missions%rowtype;
  tz text; jour date;
  ressenti text := coalesce(nullif(trim(p_ressenti), ''), 'bien');
  note text := coalesce(p_note, '');
  perso boolean; prevue boolean;
  xp_brut integer;
  c record;
  xp_avant integer; niveau_avant integer; niveau_apres integer;
begin
  select * into m from public._vm_verrouiller(uid, p_mission_id, ressenti);

  begin
    insert into public.mission_validations (user_id, mission_id, ressenti, note)
    values (uid, p_mission_id, ressenti, note);
  exception
    when unique_violation then
      raise exception 'mission déjà validée' using errcode = '23505';
  end;

  if char_length(note) > 2000 then
    raise exception 'note trop longue' using errcode = '22023';
  end if;

  select timezone into tz from public.profiles where id = uid;
  tz := coalesce(nullif(tz, ''), 'Europe/Paris');
  jour := public.jour_local(now(), tz);

  perso := coalesce((m.payload->>'perso')::boolean, m.type = 'side');
  prevue := coalesce((m.payload->>'prevue')::boolean, m.type in ('daily', 'weekly', 'main'));
  xp_brut := public.calculer_xp_mission(m.duree_min, m.difficulte, prevue, perso,
    nullif(m.payload->>'niveauMoyen', '')::numeric, public.chaine_jours_of(uid, tz, jour));
  if ressenti = 'pas_fait' then
    xp_brut := 0;
  end if;

  select * into c from public._vm_xp_credite(uid, tz, jour, xp_brut, perso);
  xp_avant := public.xp_total_of(uid);
  niveau_avant := public.niveau_depuis_xp(xp_avant);

  if c.xp > 0 then
    insert into public.xp_ledger (user_id, mission_id, montant, raison, domaine)
    values (uid, p_mission_id, c.xp, case when perso then 'mission_perso' else 'mission' end, m.domaine);
  end if;

  update public.missions set statut = 'terminee' where id = p_mission_id;

  perform public._vm_progresser(uid, m.competence_id, m.payload->'focusIds',
    case ressenti when 'trop_facile' then 2 when 'bien' then 1 when 'trop_dur' then -1 else 0 end);

  niveau_apres := public.niveau_depuis_xp(xp_avant + c.xp);
  perform public._vm_journal(uid, p_mission_id, ressenti, m.domaine, c.xp, c.plafond, niveau_avant, niveau_apres);

  return jsonb_build_object('xp', c.xp, 'xpBrut', xp_brut, 'plafond', c.plafond,
    'plafondMessage', case
      when c.plafond = 'quotidien' then 'Plafond du jour (400 XP) : une partie de l''XP n''a pas été créditée.'
      when c.plafond = 'perso' then 'Les missions perso sont limitées à 60 % de l''XP du jour.'
      else null end,
    'niveauAvant', niveau_avant, 'niveauApres', niveau_apres,
    'rangAvant', public.rang_depuis_niveau(niveau_avant), 'rangApres', public.rang_depuis_niveau(niveau_apres),
    'missionId', p_mission_id);
end;
$$;

revoke all on function public.validate_mission(uuid, text, text) from public, anon;
grant execute on function public.validate_mission(uuid, text, text) to authenticated;
