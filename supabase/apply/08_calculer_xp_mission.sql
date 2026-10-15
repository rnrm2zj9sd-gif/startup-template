-- calculer_xp_mission : minutes 5-60 × difficulté 1,0/1,3/1,6 × 1,25 si prévue × chaîne ≤ 1,3.
create or replace function public.calculer_xp_mission(
  p_minutes integer,
  p_difficulte text,
  p_prevue boolean,
  p_perso boolean,
  p_niveau_moyen numeric,
  p_chaine integer
)
returns integer
language plpgsql
immutable
as $$
declare
  minutes numeric;
  niveau numeric;
  diff_mult numeric;
  engagement numeric := 1.25;
  chaine_mult numeric;
  xp numeric;
begin
  minutes := coalesce(p_minutes, 0);
  if coalesce(p_perso, false) then
    minutes := least(30, minutes);
  end if;
  minutes := least(60, greatest(5, minutes));

  niveau := coalesce(
    p_niveau_moyen,
    case
      when p_difficulte = 'facile' then 1
      when p_difficulte = 'difficile' then 4
      else 3
    end
  );

  diff_mult := case when niveau >= 4 then 1.6 when niveau >= 3 then 1.3 else 1.0 end;
  chaine_mult := least(1.3, 1 + 0.02 * greatest(coalesce(p_chaine, 0), 0));
  xp := round(minutes * diff_mult * engagement * chaine_mult);
  if not coalesce(p_prevue, true) then
    xp := round(xp / engagement);
  end if;
  return xp::integer;
end;
$$;
