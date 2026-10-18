-- Actions joueur et snapshot. Corps identique à la base.
CREATE OR REPLACE FUNCTION public._vm_verrouiller(p_uid uuid, p_mission_id uuid, p_ressenti text)
 RETURNS missions
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  m public.missions%rowtype;
  tz text;
  jour date;
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

  -- Déjà validée : on rend la ligne pour que validate_mission rejoue le résultat, sans nouvel effet.
  if m.statut = 'terminee' then
    return m;
  end if;

  if m.statut <> 'a_faire' then
    raise exception 'mission déjà validée' using errcode = '23505';
  end if;

  select timezone into tz from public.profiles where id = p_uid;
  jour := public.jour_local(now(), coalesce(nullif(tz, ''), 'Europe/Paris'));
  if coalesce(m.payload->>'source', '') is distinct from 'calendrier'
     and m.date_locale > jour + 1 then
    raise exception 'date invalide : mission trop lointaine' using errcode = '22023';
  end if;

  return m;
end;
$function$
;

CREATE OR REPLACE FUNCTION public._vm_xp_credite(p_uid uuid, p_tz text, p_jour date, p_xp_brut integer, p_perso boolean, OUT xp integer, OUT plafond text)
 RETURNS record
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  xp_jour integer;
  xp_perso_jour integer;
  xp_restant integer;
begin
  plafond := null;

  select
    coalesce(sum(l.montant), 0)::integer,
    coalesce(sum(case when l.raison = 'mission_perso' then l.montant else 0 end), 0)::integer
  into xp_jour, xp_perso_jour
  from public.xp_ledger l
  where l.user_id = p_uid
    and public.jour_local(l.created_at, p_tz) = p_jour;

  xp_restant := greatest(0, 400 - xp_jour);
  xp := least(greatest(p_xp_brut, 0), xp_restant);
  if p_xp_brut > xp_restant then
    plafond := 'quotidien';
  end if;

  if p_perso and xp > 0 then
    declare
      officiel integer := xp_jour - xp_perso_jour;
      perso_ok integer;
    begin
      if officiel <= 0 then
        perso_ok := floor(0.6 * 400) - xp_perso_jour;
      else
        perso_ok := floor(1.5 * officiel) - xp_perso_jour;
      end if;
      perso_ok := greatest(0, perso_ok);
      if xp > perso_ok then
        xp := perso_ok;
        plafond := 'perso';
      end if;
    end;
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public._vm_progresser(p_uid uuid, p_competence text, p_focus jsonb, p_delta integer)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_focus text;
  niv integer;
  pal integer;
begin
  if p_delta <> 0 and p_competence is not null then
    for v_focus in
      select jsonb_array_elements_text(coalesce(p_focus, '[]'::jsonb))
    loop
      insert into public.skill_progress as sp (user_id, competence_id, focus_id, niveau, palier)
      values (p_uid, p_competence, v_focus, 1, 0)
      on conflict (user_id, competence_id, focus_id) do nothing;

      select sp.niveau, sp.palier into niv, pal
      from public.skill_progress sp
      where sp.user_id = p_uid and sp.competence_id = p_competence and sp.focus_id = v_focus
      for update;

      pal := pal + p_delta;
      while pal >= 4 loop
        if niv >= 5 then
          pal := 3;
          exit;
        end if;
        niv := niv + 1;
        pal := pal - 4;
      end loop;
      if pal < 0 then
        if niv > 1 then
          niv := niv - 1;
          pal := 2;
        else
          pal := 0;
        end if;
      end if;

      update public.skill_progress sp
      set niveau = niv, palier = pal
      where sp.user_id = p_uid and sp.competence_id = p_competence and sp.focus_id = v_focus;
    end loop;
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public._vm_journal(p_uid uuid, p_mission_id uuid, p_ressenti text, p_domaine text, p_xp integer, p_plafond text, p_niveau_avant integer, p_niveau_apres integer)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
;

-- Résultat déjà enregistré : même JSON, sans second crédit, journal ni palier.
CREATE OR REPLACE FUNCTION public._vm_rejeu(p_uid uuid, p_mission_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  deja_xp integer;
  deja_plafond text;
  niveau_avant integer;
  niveau_apres integer;
begin
  select coalesce(sum(l.montant), 0)::integer into deja_xp
  from public.xp_ledger l
  where l.user_id = p_uid and l.mission_id = p_mission_id;

  select sl.payload->>'plafond' into deja_plafond
  from public.system_log sl
  where sl.user_id = p_uid
    and sl.type = 'xp_gagnee'
    and sl.payload->>'missionId' = p_mission_id::text
  order by sl.created_at desc
  limit 1;

  select (sl.payload->>'de')::integer, (sl.payload->>'vers')::integer
    into niveau_avant, niveau_apres
  from public.system_log sl
  where sl.user_id = p_uid
    and sl.type = 'niveau_gagne'
    and sl.payload->>'missionId' = p_mission_id::text
  order by sl.created_at desc
  limit 1;

  if niveau_apres is null then
    niveau_apres := public.niveau_depuis_xp(public.xp_total_of(p_uid));
    niveau_avant := niveau_apres;
  end if;

  return jsonb_build_object(
    'xp', deja_xp,
    'xpBrut', deja_xp,
    'plafond', deja_plafond,
    'plafondMessage', case
      when deja_plafond = 'quotidien' then 'Plafond du jour (400 XP) : une partie de l''XP n''a pas été créditée.'
      when deja_plafond = 'perso' then 'Les missions perso sont limitées à 60 % de l''XP du jour.'
      else null end,
    'niveauAvant', niveau_avant,
    'niveauApres', niveau_apres,
    'rangAvant', public.rang_depuis_niveau(niveau_avant),
    'rangApres', public.rang_depuis_niveau(niveau_apres),
    'missionId', p_mission_id,
    'deja', true
  );
end;
$function$
;

-- XP calculée ici uniquement. Pas de paramètre d'XP : le client n'en envoie jamais.
CREATE OR REPLACE FUNCTION public.validate_mission(p_mission_id uuid, p_ressenti text DEFAULT 'bien'::text, p_note text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  if m.statut = 'terminee' then
    return public._vm_rejeu(uid, p_mission_id);
  end if;

  begin
    insert into public.mission_validations (user_id, mission_id, ressenti, note)
    values (uid, p_mission_id, ressenti, note);
  exception
    when unique_violation then
      return public._vm_rejeu(uid, p_mission_id);
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
    'missionId', p_mission_id, 'deja', false);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.reporter_mission(p_mission_id uuid)
 RETURNS missions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.remplacer_mission(p_mission_id uuid, p_exercice_id text)
 RETURNS missions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  m public.missions%rowtype;
  n integer; tz text; jour date; old_exo text; old_z text;
  exo record; prevue boolean; created public.missions%rowtype;
begin
  if uid is null then raise exception 'non authentifié' using errcode = '28000'; end if;
  select * into m from public.missions where id = p_mission_id for update;
  if not found then raise exception 'mission introuvable' using errcode = 'P0002'; end if;
  if m.user_id <> uid then raise exception 'cette mission ne t''appartient pas' using errcode = '42501'; end if;
  if m.statut <> 'a_faire' then raise exception 'mission déjà validée' using errcode = '23505'; end if;
  if m.type <> 'daily' then raise exception 'exercice invalide : mission du jour seulement' using errcode = '22023'; end if;
  select timezone into tz from public.profiles where id = uid;
  jour := public.jour_local(now(), coalesce(nullif(tz, ''), 'Europe/Paris'));
  if m.date_locale <> jour then raise exception 'exercice invalide : aujourd''hui seulement' using errcode = '22023'; end if;
  select count(*) into n from public.missions
   where user_id = uid and date_locale = jour and coalesce(payload->>'source','') = 'remplacement';
  if n >= 3 then raise exception 'limite atteinte : 3 remplacements par jour' using errcode = '23505'; end if;
  old_exo := coalesce(m.payload->>'exerciceId', m.payload #>> '{exerciceIds,0}');
  select x.focus_id into old_z from public._exercice_joueur(uid, old_exo, m.duree_min) x;
  select * into exo from public._exercice_joueur(uid, p_exercice_id, m.duree_min);
  if exo.focus_id is null then raise exception 'exercice invalide' using errcode = '22023'; end if;
  if exo.focus_id is distinct from old_z then raise exception 'exercice invalide : hors zone' using errcode = '22023'; end if;
  prevue := coalesce((m.payload->>'prevue')::boolean, false);
  update public.missions set statut = 'annulee',
      payload = coalesce(m.payload, '{}'::jsonb) || jsonb_build_object('remplacee', true) where id = m.id;
  insert into public.missions (
    user_id, date_locale, type, domaine, competence_id, titre, description,
    duree_min, difficulte, payload, xp_prevu, statut
  ) values (
    uid, jour, 'daily', m.domaine, m.competence_id, m.titre, m.description,
    exo.duree, exo.difficulte,
    jsonb_build_object('source','remplacement','exerciceId',p_exercice_id,'exerciceIds',jsonb_build_array(p_exercice_id),
      'focusIds',jsonb_build_array(exo.focus_id),'perso',exo.perso,'prevue',prevue,'garderPrevue',true,'remplacementDu',m.id::text),
    public.calculer_xp_mission(exo.duree, exo.difficulte, prevue, exo.perso, null,
      public.chaine_jours_of(uid, coalesce(nullif(tz,''),'Europe/Paris'), jour)),
    'a_faire'
  ) returning * into created;
  update public.missions
     set payload = created.payload || jsonb_build_object('prevue', prevue, 'perso', exo.perso),
         xp_prevu = public.calculer_xp_mission(exo.duree, exo.difficulte, prevue, exo.perso, null,
           public.chaine_jours_of(uid, coalesce(nullif(tz,''),'Europe/Paris'), jour))
   where id = created.id returning * into created;
  return created;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.appliquer_modes_du_jour()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  tz text;
  jour date;
begin
  if uid is null then
    return;
  end if;
  select timezone into tz from public.profiles where id = uid;
  jour := public.jour_local(now(), coalesce(nullif(tz, ''), 'Europe/Paris'));
  update public.user_skill_choices
     set mode_en_vigueur = mode
   where user_id = uid
     and mode_depuis <= jour
     and mode_en_vigueur is distinct from mode;
end;
$function$
;

CREATE OR REPLACE FUNCTION public._exercice_joueur(p_uid uuid, p_exercice_id text, p_duree integer)
 RETURNS TABLE(focus_id text, duree integer, difficulte text, perso boolean)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  off_min integer; off_max integer; off_diff text; off_focus text;
  p_val integer; p_diff text; p_focus text;
begin
  select c.focus_id, c.duree_min, c.duree_max, c.difficulte
    into off_focus, off_min, off_max, off_diff
    from public.catalogue_officiel c where c.exercice_id = p_exercice_id;
  if found then
    return query select off_focus, least(off_max, greatest(off_min, coalesce(p_duree, off_min))), off_diff, false;
    return;
  end if;
  select e->>'focusId', (e->>'valeur')::integer, e->>'difficulte'
    into p_focus, p_val, p_diff
    from public.custom_catalog c,
         jsonb_array_elements(coalesce(c.data #> '{catalogPerso,exercices}', '[]'::jsonb)) e
   where c.user_id = p_uid and e->>'id' = p_exercice_id;
  if not found then
    return;
  end if;
  return query select p_focus, p_val, p_diff, true;
end;
$function$
;

CREATE OR REPLACE FUNCTION public._ps_xp_domaines(p_uid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  xp_json jsonb;
begin
  select coalesce(jsonb_object_agg(domains.domaine, d.xp), '{}'::jsonb) into xp_json
  from (
    select unnest(array['finance','mind','health','fitness','discipline','life']) as domaine
  ) domains
  left join lateral (
    select coalesce(sum(montant), 0)::integer as xp
    from public.xp_ledger l
    where l.user_id = p_uid and l.domaine = domains.domaine
  ) d on true;
  return xp_json;
end;
$function$
;

CREATE OR REPLACE FUNCTION public._ps_niveaux_domaines(p_xp_json jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  niv_json jsonb;
begin
  select jsonb_object_agg(
    key,
    case when (value)::integer > 0 then public.niveau_depuis_xp((value)::integer) else 0 end
  ) into niv_json
  from jsonb_each_text(coalesce(p_xp_json, '{}'::jsonb));
  return niv_json;
end;
$function$
;

CREATE OR REPLACE FUNCTION public._ps_power(p_uid uuid, p_niv_json jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  objectifs_valides integer;
begin
  select count(*)::integer into objectifs_valides
  from public.goals g
  where g.user_id = p_uid
    and g.statut = 'termine'
    and (
      select count(*) from public.missions m
      where m.user_id = p_uid and m.goal_id = g.id and m.statut = 'terminee'
    ) >= 3;

  return 10 * (
    coalesce((p_niv_json->>'finance')::integer, 0)
    + coalesce((p_niv_json->>'mind')::integer, 0)
    + coalesce((p_niv_json->>'health')::integer, 0)
    + coalesce((p_niv_json->>'fitness')::integer, 0)
    + coalesce((p_niv_json->>'discipline')::integer, 0)
    + coalesce((p_niv_json->>'life')::integer, 0)
  ) + 25 * objectifs_valides;
end;
$function$
;

CREATE OR REPLACE FUNCTION public._ps_classe(p_uid uuid, p_tz text, p_jour date, p_missions_n integer)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  classe text;
  total30 integer;
  max30 integer;
  dom text;
  d_dom text;
  i integer;
  part numeric;
begin
  if p_missions_n < 10 then
    classe := 'Initié';
  else
    select coalesce(sum(montant), 0)::integer into total30
    from public.xp_ledger
    where user_id = p_uid
      and public.jour_local(created_at, p_tz) >= p_jour - 29;

    max30 := 0;
    dom := null;
    for d_dom in
      select unnest(array['finance','mind','health','fitness','discipline','life'])
    loop
      select coalesce(sum(montant), 0)::integer into i
      from public.xp_ledger
      where user_id = p_uid
        and domaine = d_dom
        and public.jour_local(created_at, p_tz) >= p_jour - 29;
      if i > max30 then
        max30 := i;
        dom := d_dom;
      end if;
    end loop;

    part := case when total30 > 0 then max30::numeric / total30 else 0 end;
    if total30 <= 0 or part <= 0.3 then
      classe := 'Balanced';
    else
      classe := case dom
        when 'finance' then 'TYCOON'
        when 'mind' then 'SAGE'
        when 'health' then 'VITAL'
        when 'fitness' then 'ATHLETE'
        when 'discipline' then 'MONK'
        when 'life' then 'SOCIAL'
        else 'Balanced'
      end;
    end if;
  end if;
  return classe;
end;
$function$
;

CREATE OR REPLACE FUNCTION public._ps_discipline(p_uid uuid, p_jour date)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  discipline integer;
  prevues integer;
  tenues integer;
  jours_actifs integer;
  reportees integer;
  reportees_faites integer;
  debut_discipline date := p_jour - 13;
begin
  select
    count(*) filter (where type in ('daily', 'weekly', 'main'))::integer,
    count(*) filter (where type in ('daily', 'weekly', 'main') and statut = 'terminee')::integer,
    count(distinct date_locale) filter (where statut = 'terminee')::integer,
    count(*) filter (where coalesce((payload->>'reportee')::boolean, false))::integer,
    count(*) filter (
      where coalesce((payload->>'reportee')::boolean, false) and statut = 'terminee'
    )::integer
  into prevues, tenues, jours_actifs, reportees, reportees_faites
  from public.missions
  where user_id = p_uid
    and date_locale between debut_discipline and p_jour;

  discipline := round(100.0 * (
    0.6 * (case when prevues > 0 then tenues::numeric / prevues else 0 end)
    + 0.25 * (jours_actifs::numeric / 14)
    + 0.15 * (case when reportees > 0 then reportees_faites::numeric / reportees else 0 end)
  ));
  return least(100, greatest(0, discipline));
end;
$function$
;

CREATE OR REPLACE FUNCTION public.progression_snapshot(p_user_id uuid DEFAULT auth.uid())
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  tz text;
  jour date;
  xp_total integer;
  niveau integer;
  xp_cumul integer;
  xp_dans integer;
  xp_next integer;
  i integer;
  missions_n integer;
  xp_json jsonb;
  niv_json jsonb;
begin
  if uid is null or p_user_id is null or p_user_id <> uid then
    raise exception 'interdit' using errcode = '42501';
  end if;

  select timezone into tz from public.profiles where id = uid;
  tz := coalesce(nullif(tz, ''), 'Europe/Paris');
  jour := public.jour_local(now(), tz);

  select coalesce(sum(montant), 0)::integer into xp_total
  from public.xp_ledger where user_id = uid;

  niveau := public.niveau_depuis_xp(xp_total);
  xp_cumul := 0;
  for i in 1 .. niveau - 1 loop
    xp_cumul := xp_cumul + public.xp_pour_niveau(i);
  end loop;
  xp_dans := greatest(0, xp_total - xp_cumul);
  xp_next := public.xp_pour_niveau(niveau);

  xp_json := public._ps_xp_domaines(uid);
  niv_json := public._ps_niveaux_domaines(xp_json);

  select count(*)::integer into missions_n
  from public.missions
  where user_id = uid and statut = 'terminee';

  return jsonb_build_object(
    'xpTotal', xp_total,
    'niveau', niveau,
    'xpDansNiveau', xp_dans,
    'xpPourSuivant', xp_next,
    'rang', public.rang_depuis_niveau(niveau),
    'power', public._ps_power(uid, niv_json),
    'classe', public._ps_classe(uid, tz, jour, missions_n),
    'discipline', public._ps_discipline(uid, jour),
    'serie', public.serie_etat(uid, tz, jour),
    'chaineJours', public.chaine_affichage_of(uid, tz, jour),
    'missionsValidees', missions_n,
    'xpParDomaine', xp_json,
    'niveauxDomaines', niv_json
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.terminer_evenement_calendrier(p_event_id uuid, p_ressenti text DEFAULT 'bien'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  uid uuid := auth.uid();
  e public.calendar_events%rowtype;
  tz text;
  jour date;
  duree integer;
  mid uuid;
  resultat jsonb;
begin
  if uid is null then
    raise exception 'non authentifié' using errcode = '28000';
  end if;

  select * into e from public.calendar_events where id = p_event_id for update;
  if not found then
    raise exception 'événement introuvable' using errcode = 'P0002';
  end if;
  if e.user_id <> uid then
    raise exception 'cette mission ne t''appartient pas' using errcode = '42501';
  end if;
  if e.statut = 'annulee' then
    raise exception 'événement annulé' using errcode = '22023';
  end if;
  if e.statut = 'terminee' then
    return jsonb_build_object(
      'xp', coalesce(e.xp_gagne, 0),
      'xpBrut', coalesce(e.xp_gagne, 0),
      'plafond', null,
      'plafondMessage', null,
      'missionId', e.mission_id,
      'eventId', e.id,
      'deja', true
    );
  end if;

  if e.kind <> 'productive' then
    update public.calendar_events
       set statut = 'terminee',
           completed_at = now(),
           xp_gagne = 0,
           updated_at = now()
     where id = e.id;
    return jsonb_build_object(
      'xp', 0, 'xpBrut', 0, 'plafond', null, 'plafondMessage', null,
      'missionId', null, 'eventId', e.id, 'deja', false
    );
  end if;

  select timezone into tz from public.profiles where id = uid;
  tz := coalesce(nullif(tz, ''), 'Europe/Paris');
  jour := public.jour_local(e.start_at, tz);
  duree := greatest(2, least(60, ceil(extract(epoch from (e.end_at - e.start_at)) / 60.0)::integer));

  mid := e.mission_id;
  if mid is null then
    insert into public.missions (
      user_id, date_locale, type, domaine, competence_id, titre, description,
      duree_min, difficulte, payload, xp_prevu, statut
    ) values (
      uid, jour, 'side', e.domaine, 'planning', e.titre, e.description,
      duree, e.difficulte,
      jsonb_build_object(
        'source', 'calendrier', 'calendrierId', e.id, 'prevue', true, 'perso', false, 'focusIds', '[]'::jsonb
      ),
      e.xp_prevu, 'a_faire'
    ) returning id into mid;

    update public.calendar_events
       set mission_id = mid, updated_at = now()
     where id = e.id;
  end if;

  resultat := public.validate_mission(mid, coalesce(nullif(trim(p_ressenti), ''), 'bien'), '');

  update public.calendar_events
     set statut = 'terminee',
         completed_at = now(),
         xp_gagne = coalesce((resultat->>'xp')::integer, 0),
         mission_id = mid,
         updated_at = now()
   where id = e.id;

  return resultat || jsonb_build_object('eventId', e.id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.reporter_evenement_calendrier(p_event_id uuid)
 RETURNS public.calendar_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  uid uuid := auth.uid();
  e public.calendar_events%rowtype;
begin
  if uid is null then
    raise exception 'non authentifié' using errcode = '28000';
  end if;
  select * into e from public.calendar_events where id = p_event_id for update;
  if not found then
    raise exception 'événement introuvable' using errcode = 'P0002';
  end if;
  if e.user_id <> uid then
    raise exception 'cette mission ne t''appartient pas' using errcode = '42501';
  end if;
  if e.statut = 'terminee' then
    raise exception 'événement déjà terminé' using errcode = '23505';
  end if;
  if e.statut = 'annulee' then
    raise exception 'événement annulé' using errcode = '22023';
  end if;

  update public.calendar_events
     set start_at = start_at + interval '1 day',
         end_at = end_at + interval '1 day',
         statut = 'reportee',
         updated_at = now()
   where id = e.id
   returning * into e;
  return e;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.annuler_evenement_calendrier(p_event_id uuid)
 RETURNS public.calendar_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  uid uuid := auth.uid();
  e public.calendar_events%rowtype;
begin
  if uid is null then
    raise exception 'non authentifié' using errcode = '28000';
  end if;
  select * into e from public.calendar_events where id = p_event_id for update;
  if not found then
    raise exception 'événement introuvable' using errcode = 'P0002';
  end if;
  if e.user_id <> uid then
    raise exception 'cette mission ne t''appartient pas' using errcode = '42501';
  end if;
  if e.statut = 'terminee' then
    raise exception 'événement déjà terminé' using errcode = '23505';
  end if;

  update public.calendar_events
     set statut = 'annulee', updated_at = now()
   where id = e.id
   returning * into e;
  return e;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.demarrer_evenement_calendrier(p_event_id uuid)
 RETURNS public.calendar_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  uid uuid := auth.uid();
  e public.calendar_events%rowtype;
begin
  if uid is null then
    raise exception 'non authentifié' using errcode = '28000';
  end if;
  select * into e from public.calendar_events where id = p_event_id for update;
  if not found then
    raise exception 'événement introuvable' using errcode = 'P0002';
  end if;
  if e.user_id <> uid then
    raise exception 'cette mission ne t''appartient pas' using errcode = '42501';
  end if;
  if e.statut not in ('planifiee', 'reportee') then
    raise exception 'événement déjà traité' using errcode = '23505';
  end if;

  update public.calendar_events
     set statut = 'en_cours', updated_at = now()
   where id = e.id
   returning * into e;
  return e;
end;
$function$
;
