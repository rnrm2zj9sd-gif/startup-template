-- xp_pour_niveau : XP pour passer du niveau N à N+1 = round(120 * N ^ 0.6).
create or replace function public.xp_pour_niveau(p_n integer)
returns integer
language sql
immutable
as $$
  select case when p_n < 1 then 0 else round(120 * power(p_n::numeric, 0.6))::integer end;
$$;

revoke all on function public.xp_pour_niveau(integer) from public, anon;
grant execute on function public.xp_pour_niveau(integer) to authenticated;
