-- Résout un exercice officiel ou perso du joueur : zone, durée, difficulté, perso.
create or replace function public._exercice_joueur(p_uid uuid, p_exercice_id text, p_duree integer)
returns table (focus_id text, duree integer, difficulte text, perso boolean)
language plpgsql
stable
set search_path = public
as $$
declare
  off_min integer; off_max integer; off_diff text; off_focus text;
  p_val integer; p_diff text; p_focus text;
begin
  select c.focus_id, c.duree_min, c.duree_max, c.difficulte
    into off_focus, off_min, off_max, off_diff
    from public.catalogue_officiel c where c.exercice_id = p_exercice_id;
  if found then
    return query select off_focus, least(off_max, greatest(off_min, coalesce(p_duree, off_min))), off_diff, false;
    return;
  end if;
  select e->>'focusId', (e->>'valeur')::integer, e->>'difficulte'
    into p_focus, p_val, p_diff
    from public.custom_catalog c,
         jsonb_array_elements(coalesce(c.data #> '{catalogPerso,exercices}', '[]'::jsonb)) e
   where c.user_id = p_uid and e->>'id' = p_exercice_id;
  if not found then
    return;
  end if;
  return query select p_focus, p_val, p_diff, true;
end;
$$;

revoke all on function public._exercice_joueur(uuid, text, integer) from public, anon, authenticated;
