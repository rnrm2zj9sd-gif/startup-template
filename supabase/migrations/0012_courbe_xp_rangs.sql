-- THEMILION · courbe XP (K = 40, p = 1,6) et rangs E → S aux niveaux 10, 25, 45, 70 et 100
-- Avant : xp_pour_niveau(n) = round(120 × n^0,6) ; rangs D 5, C 10, B 20, A 35, S 50, SS 100

-- XP totale requise pour atteindre un niveau
create or replace function public.xp_seuil_niveau(p_niveau integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case when p_niveau <= 1 then 0
              else round(40 * power((p_niveau - 1)::numeric, 1.6))::integer end;
$$;

-- XP à gagner pour passer du niveau n au niveau n + 1
-- (utilisée par niveau_depuis_xp et progression_snapshot : signature inchangée)
create or replace function public.xp_pour_niveau(p_n integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case when p_n < 1 then 0
              else public.xp_seuil_niveau(p_n + 1) - public.xp_seuil_niveau(p_n) end;
$$;

-- Rang depuis le niveau (automatique tant que les Épreuves de rang n'existent pas)
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
