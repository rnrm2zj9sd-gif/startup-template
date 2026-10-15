-- _missions_limites_insert : bornes d'une mission insérée par un joueur (auth.uid() non nul).
-- Les fonctions serveur sans session (scripts, SQL Editor) ne sont pas concernées.
-- user_id = auth.uid() reste imposé par la policy RLS missions_insert_own.
create or replace function public._missions_limites_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  nb integer;
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

  -- Sérialise les insertions d'un même joueur pour un même jour (compte exact sous concurrence).
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
