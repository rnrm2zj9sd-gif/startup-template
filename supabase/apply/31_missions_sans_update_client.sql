-- Le client ne modifie plus aucune mission : durée, difficulté, XP, statut, date et payload
-- ne changent que par validate_mission et reporter_mission (SECURITY DEFINER).
revoke update on table public.missions from anon, authenticated;

-- La policy d'UPDATE n'a plus d'effet sans le droit ; on la retire pour ne rien laisser d'ambigu.
drop policy if exists missions_update_own on public.missions;
