-- Annule la mission à faire et en crée une autre, même zone. 3 remplacements / jour.
create or replace function public.remplacer_mission(p_mission_id uuid, p_exercice_id text)
returns public.missions
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  m public.missions%rowtype;
  n integer; tz text; jour date; old_exo text; old_z text;
  exo record; prevue boolean; created public.missions%rowtype;
begin
  if uid is null then raise exception 'non authentifié' using errcode = '28000'; end if;
  select * into m from public.missions where id = p_mission_id for update;
  if not found then raise exception 'mission introuvable' using errcode = 'P0002'; end if;
  if m.user_id <> uid then raise exception 'cette mission ne t''appartient pas' using errcode = '42501'; end if;
  if m.statut <> 'a_faire' then raise exception 'mission déjà validée' using errcode = '23505'; end if;
  if m.type <> 'daily' then raise exception 'exercice invalide : mission du jour seulement' using errcode = '22023'; end if;
  select timezone into tz from public.profiles where id = uid;
  jour := public.jour_local(now(), coalesce(nullif(tz, ''), 'Europe/Paris'));
  if m.date_locale <> jour then raise exception 'exercice invalide : aujourd''hui seulement' using errcode = '22023'; end if;
  select count(*) into n from public.missions
   where user_id = uid and date_locale = jour and coalesce(payload->>'source','') = 'remplacement';
  if n >= 3 then raise exception 'limite atteinte : 3 remplacements par jour' using errcode = '23505'; end if;
  old_exo := coalesce(m.payload->>'exerciceId', m.payload #>> '{exerciceIds,0}');
  select x.focus_id into old_z from public._exercice_joueur(uid, old_exo, m.duree_min) x;
  select * into exo from public._exercice_joueur(uid, p_exercice_id, m.duree_min);
  if exo.focus_id is null then raise exception 'exercice invalide' using errcode = '22023'; end if;
  if exo.focus_id is distinct from old_z then raise exception 'exercice invalide : hors zone' using errcode = '22023'; end if;
  prevue := coalesce((m.payload->>'prevue')::boolean, false);
  update public.missions set statut = 'annulee',
      payload = coalesce(m.payload, '{}'::jsonb) || jsonb_build_object('remplacee', true) where id = m.id;
  insert into public.missions (
    user_id, date_locale, type, domaine, competence_id, titre, description,
    duree_min, difficulte, payload, xp_prevu, statut
  ) values (
    uid, jour, 'daily', m.domaine, m.competence_id, m.titre, m.description,
    exo.duree, exo.difficulte,
    jsonb_build_object('source','remplacement','exerciceId',p_exercice_id,'exerciceIds',jsonb_build_array(p_exercice_id),
      'focusIds',jsonb_build_array(exo.focus_id),'perso',exo.perso,'prevue',prevue,'garderPrevue',true,'remplacementDu',m.id::text),
    public.calculer_xp_mission(exo.duree, exo.difficulte, prevue, exo.perso, null,
      public.chaine_jours_of(uid, coalesce(nullif(tz,''),'Europe/Paris'), jour)),
    'a_faire'
  ) returning * into created;
  update public.missions
     set payload = created.payload || jsonb_build_object('prevue', prevue, 'perso', exo.perso),
         xp_prevu = public.calculer_xp_mission(exo.duree, exo.difficulte, prevue, exo.perso, null,
           public.chaine_jours_of(uid, coalesce(nullif(tz,''),'Europe/Paris'), jour))
   where id = created.id returning * into created;
  return created;
end;
$$;
