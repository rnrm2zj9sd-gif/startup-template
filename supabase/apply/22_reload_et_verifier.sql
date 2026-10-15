-- Recharge le cache PostgREST puis vérifie que fonctions, index et policy du lot 3 existent.
notify pgrst, 'reload schema';

select 'fonction' as type, f.nom, exists (
  select 1 from pg_proc p
  where p.pronamespace = 'public'::regnamespace and p.proname = f.nom
) as present
from unnest(array[
  'jour_local', 'xp_pour_niveau', 'niveau_depuis_xp', 'rang_depuis_niveau',
  'xp_total_of', 'chaine_jours_of', 'chaine_affichage_of', 'calculer_xp_mission',
  '_vm_verrouiller', '_vm_xp_credite', '_vm_progresser', '_vm_journal', 'validate_mission',
  '_ps_xp_domaines', '_ps_niveaux_domaines', '_ps_power', '_ps_classe', '_ps_discipline',
  'progression_snapshot'
]) as f(nom)
union all
select 'index', 'missions_user_date_competence_daily_uidx', exists (
  select 1 from pg_indexes
  where schemaname = 'public' and indexname = 'missions_user_date_competence_daily_uidx'
)
union all
select 'policy', 'user_skill_choices_delete_own', exists (
  select 1 from pg_policies
  where schemaname = 'public' and policyname = 'user_skill_choices_delete_own'
);
