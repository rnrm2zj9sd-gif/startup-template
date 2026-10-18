-- rang_depuis_niveau : E <10, D >=10, C >=25, B >=45, A >=70, S >=100.
create or replace function public.rang_depuis_niveau(p_niveau integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_niveau >= 100 then 'S'
    when p_niveau >= 70  then 'A'
    when p_niveau >= 45  then 'B'
    when p_niveau >= 25  then 'C'
    when p_niveau >= 10  then 'D'
    else 'E'
  end;
$$;

revoke all on function public.rang_depuis_niveau(integer) from public, anon;
grant execute on function public.rang_depuis_niveau(integer) to authenticated;
