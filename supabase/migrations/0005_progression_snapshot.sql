-- THEMILION SYSTEM — lot 3 / fichier 2
-- Lecture dérivée : niveau, rang, Power, classe. Jamais stockés comme source.
-- Relançable.

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
  discipline_pts integer;
  discipline integer;
  chaine integer;
  d date;
  prevues integer;
  terminees integer;
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

  discipline_pts := 0;
  for i in 0 .. 13 loop
    d := jour - (13 - i);
    select
      count(*) filter (where type in ('daily', 'weekly', 'main'))::integer,
      count(*) filter (where statut = 'terminee')::integer
    into prevues, terminees
    from public.missions
    where user_id = uid and date_locale = d;

    if prevues <= 0 then
      discipline_pts := discipline_pts + 15;
    elsif terminees >= prevues then
      discipline_pts := discipline_pts + 60;
    elsif terminees > 0 then
      discipline_pts := discipline_pts + 25;
    else
      discipline_pts := discipline_pts + 15;
    end if;
  end loop;
  discipline := round(100.0 * discipline_pts / (14 * 60));

  chaine := public.chaine_jours_of(uid, tz, jour);
  if exists (
    select 1 from public.xp_ledger l
    where l.user_id = uid and public.jour_local(l.created_at, tz) = jour
  ) then
    chaine := chaine + 1;
  end if;

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
