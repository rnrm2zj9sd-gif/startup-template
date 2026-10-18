-- xp_seuil_niveau : XP totale pour atteindre N = round(40 × (N-1)^1,6), 0 si N<=1.
create or replace function public.xp_seuil_niveau(p_niveau integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case when p_niveau <= 1 then 0
              else round(40 * power((p_niveau - 1)::numeric, 1.6))::integer end;
$$;

-- xp_pour_niveau : XP pour passer de n à n+1 = seuil(n+1) - seuil(n).
create or replace function public.xp_pour_niveau(p_n integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case when p_n < 1 then 0
              else public.xp_seuil_niveau(p_n + 1) - public.xp_seuil_niveau(p_n) end;
$$;

revoke all on function public.xp_seuil_niveau(integer) from public, anon;
grant execute on function public.xp_seuil_niveau(integer) to authenticated;
revoke all on function public.xp_pour_niveau(integer) from public, anon;
grant execute on function public.xp_pour_niveau(integer) to authenticated;
