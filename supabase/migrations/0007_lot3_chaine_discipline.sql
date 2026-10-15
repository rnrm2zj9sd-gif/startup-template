-- THEMILION SYSTEM — lot 3 / fichier 3
-- Chaîne qui se fissure + indice de discipline (60 / 25 / 15).
-- Coller après 0004 et 0005. Relançable. Ne touche pas à 0001–0003.

-- Jours strictement avant p_jour : bonus d'XP de la validation du jour.
create or replace function public.chaine_jours_of(p_user_id uuid, p_tz text, p_jour date)
returns integer
language plpgsql
stable
as $$
declare
  chaine integer := 0;
  derniere date := null;
  d date;
  ecart integer;
begin
  for d in
    select distinct public.jour_local(l.created_at, p_tz)
    from public.xp_ledger l
    where l.user_id = p_user_id
      and public.jour_local(l.created_at, p_tz) < p_jour
    order by 1
  loop
    if derniere is null then
      chaine := 1;
    else
      ecart := d - derniere;
      if ecart <= 2 then
        chaine := chaine + 1;
      else
        chaine := floor(chaine / 2) + 1;
      end if;
    end if;
    derniere := d;
  end loop;
  return chaine;
end;
$$;

-- Jours jusqu'à p_jour inclus : chaîne affichée.
create or replace function public.chaine_affichage_of(p_user_id uuid, p_tz text, p_jour date)
returns integer
language plpgsql
stable
as $$
declare
  chaine integer := 0;
  derniere date := null;
  d date;
  ecart integer;
begin
  for d in
    select distinct public.jour_local(l.created_at, p_tz)
    from public.xp_ledger l
    where l.user_id = p_user_id
      and public.jour_local(l.created_at, p_tz) <= p_jour
    order by 1
  loop
    if derniere is null then
      chaine := 1;
    else
      ecart := d - derniere;
      if ecart <= 2 then
        chaine := chaine + 1;
      else
        chaine := floor(chaine / 2) + 1;
      end if;
    end if;
    derniere := d;
  end loop;
  return chaine;
end;
$$;

-- Difficulté : facile ×1,0 · moyen ×1,3 · difficile ×1,6 (via le niveau du moteur).
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

-- THEMILION SYSTEM — lot 3 / lecture dérivée (reprise de 0005, discipline + chaîne alignées).

create or replace function public.progression_snapshot(p_user_id uuid default auth.uid())
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
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
  power integer;
  objectifs_valides integer;
  missions_n integer;
  classe text;
  discipline integer;
  chaine integer;
  prevues integer;
  tenues integer;
  jours_actifs integer;
  reportees integer;
  reportees_faites integer;
  debut_discipline date;
  xp_json jsonb;
  niv_json jsonb;
  total30 integer;
  max30 integer;
  dom text;
  d_dom text;
  part numeric;
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

  select coalesce(jsonb_object_agg(domains.domaine, d.xp), '{}'::jsonb) into xp_json
  from (
    select unnest(array['finance','mind','health','fitness','discipline','life']) as domaine
  ) domains
  left join lateral (
    select coalesce(sum(montant), 0)::integer as xp
    from public.xp_ledger l
    where l.user_id = uid and l.domaine = domains.domaine
  ) d on true;

  select jsonb_object_agg(
    key,
    case when (value)::integer > 0 then public.niveau_depuis_xp((value)::integer) else 0 end
  ) into niv_json
  from jsonb_each_text(coalesce(xp_json, '{}'::jsonb));

  select count(*)::integer into objectifs_valides
  from public.goals g
  where g.user_id = uid
    and g.statut = 'termine'
    and (
      select count(*) from public.missions m
      where m.user_id = uid and m.goal_id = g.id and m.statut = 'terminee'
    ) >= 3;

  power := 10 * (
    coalesce((niv_json->>'finance')::integer, 0)
    + coalesce((niv_json->>'mind')::integer, 0)
    + coalesce((niv_json->>'health')::integer, 0)
    + coalesce((niv_json->>'fitness')::integer, 0)
    + coalesce((niv_json->>'discipline')::integer, 0)
    + coalesce((niv_json->>'life')::integer, 0)
  ) + 25 * objectifs_valides;

  select count(*)::integer into missions_n
  from public.missions
  where user_id = uid and statut = 'terminee';

  if missions_n < 10 then
    classe := 'Initié';
  else
    select coalesce(sum(montant), 0)::integer into total30
    from public.xp_ledger
    where user_id = uid
      and public.jour_local(created_at, tz) >= jour - 29;

    max30 := 0;
    dom := null;
    for d_dom in
      select unnest(array['finance','mind','health','fitness','discipline','life'])
    loop
      select coalesce(sum(montant), 0)::integer into i
      from public.xp_ledger
      where user_id = uid
        and domaine = d_dom
        and public.jour_local(created_at, tz) >= jour - 29;
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

  debut_discipline := jour - 13;
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
  where user_id = uid
    and date_locale between debut_discipline and jour;

  discipline := round(100.0 * (
    0.6 * (case when prevues > 0 then tenues::numeric / prevues else 0 end)
    + 0.25 * (jours_actifs::numeric / 14)
    + 0.15 * (case when reportees > 0 then reportees_faites::numeric / reportees else 0 end)
  ));
  discipline := least(100, greatest(0, discipline));

  chaine := public.chaine_affichage_of(uid, tz, jour);

  return jsonb_build_object(
    'xpTotal', xp_total,
    'niveau', niveau,
    'xpDansNiveau', xp_dans,
    'xpPourSuivant', xp_next,
    'rang', public.rang_depuis_niveau(niveau),
    'power', power,
    'classe', classe,
    'discipline', discipline,
    'chaineJours', chaine,
    'missionsValidees', missions_n,
    'xpParDomaine', xp_json,
    'niveauxDomaines', niv_json
  );
end;
$$;

revoke all on function public.progression_snapshot(uuid) from public, anon;
grant execute on function public.progression_snapshot(uuid) to authenticated;
