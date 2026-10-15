-- _ps_niveaux_domaines (interne à progression_snapshot) : niveau de chaque domaine depuis son XP.
create or replace function public._ps_niveaux_domaines(p_xp_json jsonb)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
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
$$;

revoke all on function public._ps_niveaux_domaines(jsonb) from public, anon;
grant execute on function public._ps_niveaux_domaines(jsonb) to authenticated;
