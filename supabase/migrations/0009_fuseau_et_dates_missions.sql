-- Lot 4, durcissement 2 : fuseau IANA + cooldown 7 jours, dates d'insertion aujourd'hui/demain.
-- Même contenu que supabase/apply/36 à 40 (appliqués avec pnpm db:apply).
-- Relançable. Ne touche pas aux migrations 0000 à 0003 ni à la logique XP / RLS des lots 1 à 3.

-- Instant du dernier changement de fuseau. Le client n'a pas le droit UPDATE sur cette colonne
-- (revoke table + grant ciblé déjà en place : la nouvelle colonne n'est pas accordée).
alter table public.profiles
  add column if not exists timezone_changed_at timestamptz;

comment on column public.profiles.timezone_changed_at is
  'Dernier changement de fuseau. Premier changement libre ; 7 jours ensuite.';

-- _profiles_timezone_update : IANA uniquement (pg_timezone_names), 7 jours entre deux changements.
-- Le premier changement (timezone_changed_at nul) est libre. Même valeur = no-op.
create or replace function public._profiles_timezone_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.timezone is not distinct from old.timezone then
    return new;
  end if;

  if new.timezone is null
     or not exists (select 1 from pg_timezone_names n where n.name = new.timezone) then
    raise exception 'fuseau invalide' using errcode = '22023';
  end if;

  if old.timezone_changed_at is not null
     and old.timezone_changed_at > now() - interval '7 days' then
    raise exception 'fuseau déjà changé récemment' using errcode = '22023';
  end if;

  new.timezone_changed_at := now();
  return new;
end;
$$;

revoke all on function public._profiles_timezone_update() from public, anon, authenticated;

-- Branche le contrôle de fuseau sur public.profiles (rejouable).
drop trigger if exists profiles_timezone_update on public.profiles;
create trigger profiles_timezone_update
  before update on public.profiles
  for each row
  execute function public._profiles_timezone_update();

-- Joueur authentifié : date_locale = aujourd'hui ou demain (fuseau du profil).
-- reporter_mission (UPDATE) n'est pas concerné. auth.uid() nul : pas de contrôle (scripts).
create or replace function public._missions_limites_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  nb integer;
  tz text;
  jour date;
begin
  if uid is null then
    return new;
  end if;

  if new.duree_min is null or new.duree_min < 2 or new.duree_min > 60 then
    raise exception 'durée invalide : 2 à 60 minutes' using errcode = '22023';
  end if;
  if new.difficulte is null or new.difficulte not in ('facile', 'moyen', 'difficile') then
    raise exception 'difficulté invalide' using errcode = '22023';
  end if;
  if new.type is null or new.type not in ('daily', 'first') then
    raise exception 'type de mission invalide' using errcode = '22023';
  end if;
  if new.statut is distinct from 'a_faire' then
    raise exception 'statut invalide : une mission naît à faire' using errcode = '22023';
  end if;

  select timezone into tz from public.profiles where id = uid;
  jour := public.jour_local(now(), coalesce(nullif(tz, ''), 'Europe/Paris'));
  if new.date_locale is distinct from jour
     and new.date_locale is distinct from (jour + 1) then
    raise exception 'date invalide : aujourd''hui ou demain' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(uid::text || ':' || new.date_locale::text, 0));

  select count(*) into nb
  from public.missions
  where user_id = uid
    and date_locale = new.date_locale
    and statut <> 'annulee';

  if nb >= 12 then
    raise exception 'limite atteinte : 12 missions par jour' using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function public._missions_limites_insert() from public, anon, authenticated;

-- validate_mission refuse une mission datée au-delà de demain (jour local du joueur).
-- Les dates passées restent valides (tests / rattrapage). XP et RLS inchangés.
create or replace function public._vm_verrouiller(p_uid uuid, p_mission_id uuid, p_ressenti text)
returns public.missions
language plpgsql
set search_path = public
as $$
declare
  m public.missions%rowtype;
  tz text;
  jour date;
begin
  if p_uid is null then
    raise exception 'non authentifié' using errcode = '28000';
  end if;

  if p_ressenti not in ('trop_facile', 'bien', 'trop_dur', 'pas_fait') then
    raise exception 'ressenti invalide' using errcode = '22023';
  end if;

  select * into m
  from public.missions
  where id = p_mission_id
  for update;

  if not found then
    raise exception 'mission introuvable' using errcode = 'P0002';
  end if;

  if m.user_id <> p_uid then
    raise exception 'cette mission ne t''appartient pas' using errcode = '42501';
  end if;

  if m.statut <> 'a_faire' then
    raise exception 'mission déjà validée' using errcode = '23505';
  end if;

  select timezone into tz from public.profiles where id = p_uid;
  jour := public.jour_local(now(), coalesce(nullif(tz, ''), 'Europe/Paris'));
  if m.date_locale > jour + 1 then
    raise exception 'date invalide : mission trop lointaine' using errcode = '22023';
  end if;

  return m;
end;
$$;

revoke all on function public._vm_verrouiller(uuid, uuid, text) from public, anon, authenticated;
