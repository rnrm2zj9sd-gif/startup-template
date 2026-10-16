-- Bornes du catalogue perso (json custom_catalog.data.catalogPerso). auth.uid() nul : scripts.
create or replace function public._custom_catalog_limites()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  n integer;
  e jsonb;
  lien text;
begin
  if uid is null or new.user_id is distinct from uid then
    return new;
  end if;

  n := coalesce(jsonb_array_length(new.data->'catalogPerso'->'competences'), 0)
     + coalesce(jsonb_array_length(new.data->'catalogPerso'->'focus'), 0)
     + coalesce(jsonb_array_length(new.data->'catalogPerso'->'exercices'), 0);
  if n > 30 then
    raise exception 'limite atteinte : 30 éléments perso' using errcode = '22023';
  end if;

  for e in select * from jsonb_array_elements(coalesce(new.data->'catalogPerso'->'competences', '[]'::jsonb)) loop
    if char_length(coalesce(e->>'nom', '')) < 1 or char_length(e->>'nom') > 60 then
      raise exception 'nom invalide : 60 caractères maximum' using errcode = '22023';
    end if;
    if coalesce(e->>'domaine', '') not in (
      'Finance', 'Mental', 'Santé', 'Physique', 'Discipline & Productivité', 'Vie personnelle'
    ) then
      raise exception 'domaine invalide' using errcode = '22023';
    end if;
  end loop;

  for e in select * from jsonb_array_elements(coalesce(new.data->'catalogPerso'->'focus', '[]'::jsonb)) loop
    if char_length(coalesce(e->>'nom', '')) < 1 or char_length(e->>'nom') > 60 then
      raise exception 'nom invalide : 60 caractères maximum' using errcode = '22023';
    end if;
  end loop;

  for e in select * from jsonb_array_elements(coalesce(new.data->'catalogPerso'->'exercices', '[]'::jsonb)) loop
    if char_length(coalesce(e->>'nom', '')) < 1 or char_length(e->>'nom') > 60 then
      raise exception 'nom invalide : 60 caractères maximum' using errcode = '22023';
    end if;
    if char_length(coalesce(e->>'consigne', '')) > 300 then
      raise exception 'consigne invalide : 300 caractères maximum' using errcode = '22023';
    end if;
    if coalesce((e->>'valeur')::integer, 0) < 2 or (e->>'valeur')::integer > 30 then
      raise exception 'durée invalide : 2 à 30 minutes' using errcode = '22023';
    end if;
    if coalesce(e->>'difficulte', '') not in ('facile', 'moyen', 'difficile') then
      raise exception 'difficulté invalide' using errcode = '22023';
    end if;
    lien := nullif(e->>'lien', '');
    if lien is not null and lien !~ '^https://[^[:space:]]+$' then
      raise exception 'lien invalide : https seulement' using errcode = '22023';
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function public._custom_catalog_limites() from public, anon, authenticated;

drop trigger if exists custom_catalog_limites on public.custom_catalog;
create trigger custom_catalog_limites
  before insert or update on public.custom_catalog
  for each row
  execute function public._custom_catalog_limites();
