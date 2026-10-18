-- progression_snapshot : lecture dérivée (niveau, rang, power, classe, discipline, chaîne).
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
    'chaineJours', public.chaine_affichage_of(uid, tz, jour),
    'missionsValidees', missions_n,
    'xpParDomaine', xp_json,
    'niveauxDomaines', niv_json
  );
end;
$$;

revoke all on function public.progression_snapshot(uuid) from public, anon;
grant execute on function public.progression_snapshot(uuid) to authenticated;
