-- Policy : le joueur peut retirer ses propres compétences du contrat (Paramètres).
drop policy if exists user_skill_choices_delete_own on public.user_skill_choices;
create policy user_skill_choices_delete_own on public.user_skill_choices
  for delete to authenticated
  using (user_id = auth.uid());
