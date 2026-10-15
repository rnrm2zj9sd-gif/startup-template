-- rang_depuis_niveau : E 1-4, D 5-9, C 10-19, B 20-34, A 35-49, S 50-99, SS 100+.
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

revoke all on function public.rang_depuis_niveau(integer) from public, anon;
grant execute on function public.rang_depuis_niveau(integer) to authenticated;
