-- _ps_power (interne à progression_snapshot) : 10 × Σ niveaux de domaine + 25 × objectifs valides.
create or replace function public._ps_power(p_uid uuid, p_niv_json jsonb)
returns integer
language plpgsql
stable
security invoker
set search_path = public
as $$
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
$$;

revoke all on function public._ps_power(uuid, jsonb) from public, anon;
grant execute on function public._ps_power(uuid, jsonb) to authenticated;
