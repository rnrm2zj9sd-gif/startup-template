-- THEMILION SYSTEM — lot 3 / fichier 1
-- Coller dans Supabase → SQL Editor → New query, puis Run.
-- Relançable. Ne touche pas aux migrations 0001–0003.
-- Constantes = lib/progression/config.ts (courbe 120·n^0.6, plafonds 400 / 60 %, rangs E→SS).

create or replace function public.jour_local(p_ts timestamptz, p_tz text)
returns date
language sql
immutable
as $$
  select (p_ts at time zone coalesce(nullif(p_tz, ''), 'Europe/Paris'))::date;
$$;

create or replace function public.xp_pour_niveau(p_n integer)
returns integer
language sql
immutable
as $$
  select case when p_n < 1 then 0 else round(120 * power(p_n::numeric, 0.6))::integer end;
$$;

create or replace function public.niveau_depuis_xp(p_xp integer)
returns integer
language plpgsql
immutable
as $$
declare
  rest integer := greatest(0, coalesce(p_xp, 0));
  niveau integer := 1;
  besoin integer;
begin
  loop
    besoin := public.xp_pour_niveau(niveau);
    exit when rest < besoin;
    rest := rest - besoin;
    niveau := niveau + 1;
    exit when niveau > 10000;
  end loop;
  return niveau;
end;
$$;

create or replace function public.rang_depuis_niveau(p_niveau integer)
returns text
language sql
immutable
as $$
  select case
    when p_niveau >= 100 then 'SS'
    when p_niveau >= 50 then 'S'
    when p_niveau >= 35 then 'A'
    when p_niveau >= 20 then 'B'
    when p_niveau >= 10 then 'C'
    when p_niveau >= 5 then 'D'
    else 'E'
  end;
$$;

create or replace function public.xp_total_of(p_user_id uuid)
returns integer
language sql
stable
as $$
  select coalesce(sum(montant), 0)::integer from public.xp_ledger where user_id = p_user_id;
$$;

create or replace function public.chaine_jours_of(p_user_id uuid, p_tz text, p_jour date)
returns integer
language plpgsql
stable
as $$
declare
  d date := p_jour - 1;
  n integer := 0;
begin
  while exists (
    select 1
    from public.xp_ledger l
    where l.user_id = p_user_id
      and public.jour_local(l.created_at, p_tz) = d
  ) loop
    n := n + 1;
    d := d - 1;
    exit when n > 4000;
  end loop;
  return n;
end;
$$;

create or replace function public.calculer_xp_mission(
  p_minutes integer,
  p_difficulte text,
  p_prevue boolean,
  p_perso boolean,
  p_niveau_moyen numeric,
  p_chaine integer
)
returns integer
language plpgsql
immutable
as $$
declare
  minutes numeric;
  niveau numeric;
  diff_mult numeric;
  engagement numeric := 1.25;
  chaine_mult numeric;
  xp numeric;
begin
  minutes := coalesce(p_minutes, 0);
  if coalesce(p_perso, false) then
    minutes := least(30, minutes);
  end if;
  minutes := least(60, greatest(5, minutes));

  niveau := coalesce(
    p_niveau_moyen,
    case
      when p_difficulte = 'facile' then 1
      when p_difficulte = 'difficile' then 4
      else 3
    end
  );

  diff_mult := case when niveau >= 4 then 1.6 when niveau >= 3 then 1.3 else 1.0 end;
  chaine_mult := least(1.3, 1 + 0.02 * greatest(coalesce(p_chaine, 0), 0));
  xp := round(minutes * diff_mult * engagement * chaine_mult);
  if not coalesce(p_prevue, true) then
    xp := round(xp / engagement);
  end if;
  return xp::integer;
end;
$$;

create unique index if not exists missions_user_date_competence_daily_uidx
  on public.missions (user_id, date_locale, competence_id)
  where type = 'daily';

-- Retirer une compétence du contrat (Paramètres).
drop policy if exists user_skill_choices_delete_own on public.user_skill_choices;
create policy user_skill_choices_delete_own on public.user_skill_choices
  for delete to authenticated
  using (user_id = auth.uid());

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
  tz text;
  jour date;
  ressenti text := coalesce(nullif(trim(p_ressenti), ''), 'bien');
  note text := coalesce(p_note, '');
  perso boolean;
  prevue boolean;
  niveau_moyen numeric;
  chaine integer;
  xp_brut integer;
  xp_jour integer;
  xp_perso_jour integer;
  xp_restant integer;
  xp integer;
  plafond text := null;
  xp_avant integer;
  niveau_avant integer;
  niveau_apres integer;
  rang_avant text;
  rang_apres text;
  v_focus text;
  competence text;
  delta integer;
  niv integer;
  pal integer;
begin
  if uid is null then
    raise exception 'non authentifié' using errcode = '28000';
  end if;

  if ressenti not in ('trop_facile', 'bien', 'trop_dur', 'pas_fait') then
    raise exception 'ressenti invalide' using errcode = '22023';
  end if;

  select * into m
  from public.missions
  where id = p_mission_id
  for update;

  if not found then
    raise exception 'mission introuvable' using errcode = 'P0002';
  end if;

  if m.user_id <> uid then
    raise exception 'cette mission ne t''appartient pas' using errcode = '42501';
  end if;

  if m.statut <> 'a_faire' then
    raise exception 'mission déjà validée' using errcode = '23505';
  end if;

  begin
    insert into public.mission_validations (user_id, mission_id, ressenti, note)
    values (uid, p_mission_id, ressenti, note);
  exception
    when unique_violation then
      raise exception 'mission déjà validée' using errcode = '23505';
  end;

  -- Après l'insert : une note trop longue annule tout (transaction).
  if char_length(note) > 2000 then
    raise exception 'note trop longue' using errcode = '22023';
  end if;

  select timezone into tz from public.profiles where id = uid;
  tz := coalesce(nullif(tz, ''), 'Europe/Paris');
  jour := public.jour_local(now(), tz);

  perso := coalesce((m.payload->>'perso')::boolean, m.type = 'side');
  prevue := coalesce((m.payload->>'prevue')::boolean, m.type in ('daily', 'weekly', 'main'));
  niveau_moyen := nullif(m.payload->>'niveauMoyen', '')::numeric;
  chaine := public.chaine_jours_of(uid, tz, jour);

  xp_brut := public.calculer_xp_mission(m.duree_min, m.difficulte, prevue, perso, niveau_moyen, chaine);
  if ressenti = 'pas_fait' then
    xp_brut := 0;
  end if;

  select
    coalesce(sum(l.montant), 0)::integer,
    coalesce(sum(case when l.raison = 'mission_perso' then l.montant else 0 end), 0)::integer
  into xp_jour, xp_perso_jour
  from public.xp_ledger l
  where l.user_id = uid
    and public.jour_local(l.created_at, tz) = jour;

  xp_restant := greatest(0, 400 - xp_jour);
  xp := least(greatest(xp_brut, 0), xp_restant);
  if xp_brut > xp_restant then
    plafond := 'quotidien';
  end if;

  if perso and xp > 0 then
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

  xp_avant := public.xp_total_of(uid);
  niveau_avant := public.niveau_depuis_xp(xp_avant);
  rang_avant := public.rang_depuis_niveau(niveau_avant);

  if xp > 0 then
    insert into public.xp_ledger (user_id, mission_id, montant, raison, domaine)
    values (uid, p_mission_id, xp, case when perso then 'mission_perso' else 'mission' end, m.domaine);
  end if;

  update public.missions
  set statut = 'terminee'
  where id = p_mission_id;

  competence := m.competence_id;
  delta := case ressenti
    when 'trop_facile' then 2
    when 'bien' then 1
    when 'trop_dur' then -1
    else 0
  end;

  if delta <> 0 and competence is not null then
    for v_focus in
      select jsonb_array_elements_text(coalesce(m.payload->'focusIds', '[]'::jsonb))
    loop
      insert into public.skill_progress as sp (user_id, competence_id, focus_id, niveau, palier)
      values (uid, competence, v_focus, 1, 0)
      on conflict (user_id, competence_id, focus_id) do nothing;

      select sp.niveau, sp.palier into niv, pal
      from public.skill_progress sp
      where sp.user_id = uid and sp.competence_id = competence and sp.focus_id = v_focus
      for update;

      pal := pal + delta;
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
      where sp.user_id = uid and sp.competence_id = competence and sp.focus_id = v_focus;
    end loop;
  end if;

  niveau_apres := public.niveau_depuis_xp(xp_avant + xp);
  rang_apres := public.rang_depuis_niveau(niveau_apres);

  insert into public.system_log (user_id, type, payload)
  values (
    uid,
    'mission_validee',
    jsonb_build_object('missionId', p_mission_id, 'ressenti', ressenti, 'domaine', m.domaine)
  );

  if xp > 0 then
    insert into public.system_log (user_id, type, payload)
    values (
      uid,
      'xp_gagnee',
      jsonb_build_object('missionId', p_mission_id, 'xp', xp, 'plafond', plafond)
    );
  end if;

  if niveau_apres > niveau_avant then
    insert into public.system_log (user_id, type, payload)
    values (
      uid,
      'niveau_gagne',
      jsonb_build_object('missionId', p_mission_id, 'de', niveau_avant, 'vers', niveau_apres)
    );
  end if;

  if rang_apres is distinct from rang_avant then
    insert into public.system_log (user_id, type, payload)
    values (
      uid,
      'rang_obtenu',
      jsonb_build_object('missionId', p_mission_id, 'de', rang_avant, 'vers', rang_apres)
    );
  end if;

  return jsonb_build_object(
    'xp', xp,
    'xpBrut', xp_brut,
    'plafond', plafond,
    'plafondMessage', case
      when plafond = 'quotidien' then 'Plafond du jour (400 XP) : une partie de l''XP n''a pas été créditée.'
      when plafond = 'perso' then 'Les missions perso sont limitées à 60 % de l''XP du jour.'
      else null
    end,
    'niveauAvant', niveau_avant,
    'niveauApres', niveau_apres,
    'rangAvant', rang_avant,
    'rangApres', rang_apres,
    'missionId', p_mission_id
  );
end;
$$;

revoke all on function public.validate_mission(uuid, text, text) from public, anon;
grant execute on function public.validate_mission(uuid, text, text) to authenticated;

revoke all on function public.jour_local(timestamptz, text) from public, anon;
grant execute on function public.jour_local(timestamptz, text) to authenticated;

revoke all on function public.xp_pour_niveau(integer) from public, anon;
grant execute on function public.xp_pour_niveau(integer) to authenticated;

revoke all on function public.niveau_depuis_xp(integer) from public, anon;
grant execute on function public.niveau_depuis_xp(integer) to authenticated;

revoke all on function public.rang_depuis_niveau(integer) from public, anon;
grant execute on function public.rang_depuis_niveau(integer) to authenticated;
