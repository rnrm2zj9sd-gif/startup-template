-- _vm_xp_credite (interne à validate_mission) : plafonds du jour (400 XP, perso 60 %).
create or replace function public._vm_xp_credite(
  p_uid uuid,
  p_tz text,
  p_jour date,
  p_xp_brut integer,
  p_perso boolean,
  out xp integer,
  out plafond text
)
language plpgsql
set search_path = public
as $$
declare
  xp_jour integer;
  xp_perso_jour integer;
  xp_restant integer;
begin
  plafond := null;

  select
    coalesce(sum(l.montant), 0)::integer,
    coalesce(sum(case when l.raison = 'mission_perso' then l.montant else 0 end), 0)::integer
  into xp_jour, xp_perso_jour
  from public.xp_ledger l
  where l.user_id = p_uid
    and public.jour_local(l.created_at, p_tz) = p_jour;

  xp_restant := greatest(0, 400 - xp_jour);
  xp := least(greatest(p_xp_brut, 0), xp_restant);
  if p_xp_brut > xp_restant then
    plafond := 'quotidien';
  end if;

  if p_perso and xp > 0 then
    declare
      officiel integer := xp_jour - xp_perso_jour;
      perso_ok integer;
    begin
      if officiel <= 0 then
        perso_ok := floor(0.6 * 400) - xp_perso_jour;
      else
        perso_ok := floor(1.5 * officiel) - xp_perso_jour;
      end if;
      perso_ok := greatest(0, perso_ok);
      if xp > perso_ok then
        xp := perso_ok;
        plafond := 'perso';
      end if;
    end;
  end if;
end;
$$;

revoke all on function public._vm_xp_credite(uuid, text, date, integer, boolean) from public, anon, authenticated;
