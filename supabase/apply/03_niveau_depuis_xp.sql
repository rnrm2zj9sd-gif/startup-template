-- niveau_depuis_xp : niveau atteint pour un total d'XP (dérivé, jamais stocké).
create or replace function public.niveau_depuis_xp(p_xp integer)
returns integer
language plpgsql
immutable
as $$
declare
  rest integer := greatest(0, coalesce(p_xp, 0));
  niveau integer := 1;
  besoin integer;
begin
  loop
    besoin := public.xp_pour_niveau(niveau);
    exit when rest < besoin;
    rest := rest - besoin;
    niveau := niveau + 1;
    exit when niveau > 10000;
  end loop;
  return niveau;
end;
$$;

revoke all on function public.niveau_depuis_xp(integer) from public, anon;
grant execute on function public.niveau_depuis_xp(integer) to authenticated;
