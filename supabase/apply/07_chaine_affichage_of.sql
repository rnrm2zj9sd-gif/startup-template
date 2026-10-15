-- chaine_affichage_of : chaîne affichée, jours jusqu'à p_jour inclus (même règle de fissure).
create or replace function public.chaine_affichage_of(p_user_id uuid, p_tz text, p_jour date)
returns integer
language plpgsql
stable
as $$
declare
  chaine integer := 0;
  derniere date := null;
  d date;
  ecart integer;
begin
  for d in
    select distinct public.jour_local(l.created_at, p_tz)
    from public.xp_ledger l
    where l.user_id = p_user_id
      and public.jour_local(l.created_at, p_tz) <= p_jour
    order by 1
  loop
    if derniere is null then
      chaine := 1;
    else
      ecart := d - derniere;
      if ecart <= 2 then
        chaine := chaine + 1;
      else
        chaine := floor(chaine / 2) + 1;
      end if;
    end if;
    derniere := d;
  end loop;
  return chaine;
end;
$$;
