-- _ps_discipline (interne à progression_snapshot) : 60 % tenues + 25 % jours actifs + 15 % reportées, 14 jours.
create or replace function public._ps_discipline(p_uid uuid, p_jour date)
returns integer
language plpgsql
stable
security invoker
set search_path = public
as $$
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
$$;

revoke all on function public._ps_discipline(uuid, date) from public, anon;
grant execute on function public._ps_discipline(uuid, date) to authenticated;
