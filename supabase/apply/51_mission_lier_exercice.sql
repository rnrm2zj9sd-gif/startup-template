-- Daily : exercice officiel ou perso du joueur. Écrase perso, prevue, niveauMoyen.
-- auth.uid() est déjà non nul (l'appelant saute les scripts et le type first).
create or replace function public._mission_lier_exercice(
  p_uid uuid, p_date date, p_duree integer, p_diff text, p_competence text, p_payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  payload jsonb := coalesce(p_payload, '{}'::jsonb);
  ids text[];
  exo text;
  controle boolean;
  perso boolean := false;
  off_min integer; off_max integer; off_diff text;
  p_val integer; p_difficulte text;
  moyenne numeric;
  tz text;
  jour date;
begin
  ids := array(
    select distinct t.x from (
      select payload->>'exerciceId' as x
      union all
      select jsonb_array_elements_text(case when jsonb_typeof(payload->'exerciceIds') = 'array' then payload->'exerciceIds' else '[]'::jsonb end)
      union all
      select e->>'exerciceId' from jsonb_array_elements(
        case when jsonb_typeof(payload #> '{seance,exercices}') = 'array' then payload #> '{seance,exercices}' else '[]'::jsonb end
      ) e
    ) t where t.x is not null and t.x <> ''
  );
  if coalesce(array_length(ids, 1), 0) = 0 then
    raise exception 'exercice inconnu' using errcode = '22023';
  end if;

  controle := coalesce(jsonb_array_length(
    case when jsonb_typeof(payload #> '{seance,exercices}') = 'array' then payload #> '{seance,exercices}' else '[]'::jsonb end
  ), 0) <= 1;

  foreach exo in array ids loop
    select duree_min, duree_max, difficulte into off_min, off_max, off_diff
    from public.catalogue_officiel where exercice_id = exo;
    if found then
      if controle and (p_duree < off_min or p_duree > off_max or p_diff is distinct from off_diff) then
        raise exception 'exercice non conforme' using errcode = '22023';
      end if;
    else
      select (e->>'valeur')::integer, e->>'difficulte' into p_val, p_difficulte
      from public.custom_catalog c,
           jsonb_array_elements(coalesce(c.data #> '{catalogPerso,exercices}', '[]'::jsonb)) e
      where c.user_id = p_uid and e->>'id' = exo;
      if not found then
        raise exception 'exercice inconnu' using errcode = '22023';
      end if;
      perso := true;
      if controle and (p_duree is distinct from p_val or p_diff is distinct from p_difficulte) then
        raise exception 'exercice non conforme' using errcode = '22023';
      end if;
    end if;
  end loop;

  select p.timezone into tz from public.profiles p where p.id = p_uid;
  jour := public.jour_local(now(), coalesce(nullif(tz, ''), 'Europe/Paris'));
  select avg(sp.niveau) into moyenne from public.skill_progress sp
  where sp.user_id = p_uid and sp.competence_id = p_competence;

  payload := jsonb_set(payload, '{perso}', to_jsonb(perso), true);
  payload := jsonb_set(payload, '{prevue}', to_jsonb(p_date > jour), true);
  if moyenne is null then payload := payload - 'niveauMoyen';
  else payload := jsonb_set(payload, '{niveauMoyen}', to_jsonb(moyenne), true);
  end if;
  return payload;
end;
$$;

revoke all on function public._mission_lier_exercice(uuid, date, integer, text, text, jsonb) from public, anon, authenticated;
