-- _ps_xp_domaines (interne à progression_snapshot) : XP par domaine, 6 clés toujours présentes.
create or replace function public._ps_xp_domaines(p_uid uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
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
$$;

revoke all on function public._ps_xp_domaines(uuid) from public, anon;
grant execute on function public._ps_xp_domaines(uuid) to authenticated;
