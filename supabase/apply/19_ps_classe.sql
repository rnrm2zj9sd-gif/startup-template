-- _ps_classe (interne à progression_snapshot) : Initié < 10 missions, sinon domaine dominant sur 30 jours.
create or replace function public._ps_classe(p_uid uuid, p_tz text, p_jour date, p_missions_n integer)
returns text
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  classe text;
  total30 integer;
  max30 integer;
  dom text;
  d_dom text;
  i integer;
  part numeric;
begin
  if p_missions_n < 10 then
    classe := 'Initié';
  else
    select coalesce(sum(montant), 0)::integer into total30
    from public.xp_ledger
    where user_id = p_uid
      and public.jour_local(created_at, p_tz) >= p_jour - 29;

    max30 := 0;
    dom := null;
    for d_dom in
      select unnest(array['finance','mind','health','fitness','discipline','life'])
    loop
      select coalesce(sum(montant), 0)::integer into i
      from public.xp_ledger
      where user_id = p_uid
        and domaine = d_dom
        and public.jour_local(created_at, p_tz) >= p_jour - 29;
      if i > max30 then
        max30 := i;
        dom := d_dom;
      end if;
    end loop;

    part := case when total30 > 0 then max30::numeric / total30 else 0 end;
    if total30 <= 0 or part <= 0.3 then
      classe := 'Balanced';
    else
      classe := case dom
        when 'finance' then 'TYCOON'
        when 'mind' then 'SAGE'
        when 'health' then 'VITAL'
        when 'fitness' then 'ATHLETE'
        when 'discipline' then 'MONK'
        when 'life' then 'SOCIAL'
        else 'Balanced'
      end;
    end if;
  end if;
  return classe;
end;
$$;

revoke all on function public._ps_classe(uuid, text, date, integer) from public, anon;
grant execute on function public._ps_classe(uuid, text, date, integer) to authenticated;
