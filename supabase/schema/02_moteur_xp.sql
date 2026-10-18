-- Moteur XP / dates. Corps identique à la base.
CREATE OR REPLACE FUNCTION public.jour_local(p_ts timestamp with time zone, p_tz text)
 RETURNS date
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select (p_ts at time zone coalesce(nullif(p_tz, ''), 'Europe/Paris'))::date;
$function$
;

CREATE OR REPLACE FUNCTION public.xp_seuil_niveau(p_niveau integer)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case when p_niveau <= 1 then 0
              else round(40 * power((p_niveau - 1)::numeric, 1.6))::integer end;
$function$
;

CREATE OR REPLACE FUNCTION public.xp_pour_niveau(p_n integer)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case when p_n < 1 then 0
              else public.xp_seuil_niveau(p_n + 1) - public.xp_seuil_niveau(p_n) end;
$function$
;

CREATE OR REPLACE FUNCTION public.niveau_depuis_xp(p_xp integer)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.rang_depuis_niveau(p_niveau integer)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case
    when p_niveau >= 100 then 'S'
    when p_niveau >= 70  then 'A'
    when p_niveau >= 45  then 'B'
    when p_niveau >= 25  then 'C'
    when p_niveau >= 10  then 'D'
    else 'E'
  end;
$function$
;

CREATE OR REPLACE FUNCTION public.calculer_xp_mission(p_minutes integer, p_difficulte text, p_prevue boolean, p_perso boolean, p_niveau_moyen numeric, p_chaine integer)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.xp_total_of(p_user_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select coalesce(sum(montant), 0)::integer from public.xp_ledger where user_id = p_user_id;
$function$
;

CREATE OR REPLACE FUNCTION public.chaine_jours_of(p_user_id uuid, p_tz text, p_jour date)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
      and public.jour_local(l.created_at, p_tz) < p_jour
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
$function$
;

CREATE OR REPLACE FUNCTION public.chaine_affichage_of(p_user_id uuid, p_tz text, p_jour date)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$
;
