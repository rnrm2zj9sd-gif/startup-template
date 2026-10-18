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

-- Séries de jours : règle pure (miroir exact de lib/progression/serie.ts)
create or replace function public.serie_depuis_jours(p_jours date[], p_jour date)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  jours date[] := array(
    select distinct j from unnest(coalesce(p_jours, '{}'::date[])) as j
    where j <= p_jour order by 1
  );
  d date := jours[1];
  serie integer := 0;
  boucliers integer := 0;
  compteur integer := 0;
  meilleure integer := 0;
  evt jsonb := null;
  serie_hier integer;
  valide_aujourdhui boolean;
  bouclier_gagne boolean := false;
  nouveau_record boolean := false;
  apres integer;
begin
  while d is not null and d < p_jour loop
    if d = any (jours) then
      serie := serie + 1;
      compteur := compteur + 1;
      if compteur >= 7 then
        boucliers := least(2, boucliers + 1);
        compteur := 0;
      end if;
      meilleure := greatest(meilleure, serie);
    else
      if serie > 0 then
        if boucliers > 0 then
          boucliers := boucliers - 1;
          evt := jsonb_build_object('type', 'bouclier', 'jour', d, 'serie', serie);
        else
          apres := serie / 2;
          evt := jsonb_build_object('type', 'moitie', 'jour', d, 'avant', serie, 'apres', apres);
          serie := apres;
        end if;
      end if;
      compteur := 0;
    end if;
    d := d + 1;
  end loop;

  serie_hier := serie;
  valide_aujourdhui := p_jour = any (jours);
  if valide_aujourdhui then
    serie := serie + 1;
    compteur := compteur + 1;
    if compteur >= 7 then
      bouclier_gagne := boucliers < 2;
      boucliers := least(2, boucliers + 1);
      compteur := 0;
    end if;
    nouveau_record := serie > meilleure;
    meilleure := greatest(meilleure, serie);
  end if;

  return jsonb_build_object(
    'serie', serie,
    'serieHier', serie_hier,
    'aujourdHuiValide', valide_aujourdhui,
    'boucliers', boucliers,
    'bouclierMax', 2,
    'joursVersBouclier', 7 - compteur,
    'bouclierGagneAujourdhui', bouclier_gagne,
    'record', meilleure,
    'nouveauRecord', nouveau_record,
    'dernierEvenement', evt,
    'evenementHier', coalesce((evt->>'jour')::date = p_jour - 1, false),
    'prochainPalier', (select min(p) from unnest(array[3, 7, 14, 30, 60, 100, 180, 365]) as p where p > serie),
    'bonusXpPct', least(30, 2 * serie_hier)
  );
end;
$$;

-- Série d'un joueur, depuis son journal d'XP (jour local du joueur)
create or replace function public.serie_etat(p_user_id uuid, p_tz text, p_jour date)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select public.serie_depuis_jours(
    array(
      select distinct public.jour_local(l.created_at, p_tz)
      from public.xp_ledger l
      where l.user_id = p_user_id
    ),
    p_jour
  );
$$;

-- Série d'hier : sert au bonus XP du jour (signature inchangée)
create or replace function public.chaine_jours_of(p_user_id uuid, p_tz text, p_jour date)
returns integer
language sql
stable
set search_path = ''
as $$
  select (public.serie_etat(p_user_id, p_tz, p_jour)->>'serieHier')::integer;
$$;

-- Série affichée : celle d'hier, +1 si aujourd'hui est validé (signature inchangée)
create or replace function public.chaine_affichage_of(p_user_id uuid, p_tz text, p_jour date)
returns integer
language sql
stable
set search_path = ''
as $$
  select (public.serie_etat(p_user_id, p_tz, p_jour)->>'serie')::integer;
$$;
