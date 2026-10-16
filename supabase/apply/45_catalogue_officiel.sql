-- Catalogue officiel : lecture seule pour les joueurs. Rejouable.
create table if not exists public.catalogue_officiel (
  exercice_id text primary key,
  competence_id text not null,
  focus_id text not null,
  duree_min integer not null,
  duree_max integer not null,
  difficulte text not null,
  niveau integer not null,
  constraint catalogue_officiel_duree_check check (duree_min >= 2 and duree_max >= duree_min and duree_max <= 60),
  constraint catalogue_officiel_difficulte_check check (difficulte in ('facile', 'moyen', 'difficile')),
  constraint catalogue_officiel_niveau_check check (niveau between 1 and 5)
);

alter table public.catalogue_officiel enable row level security;

revoke all on table public.catalogue_officiel from anon, authenticated;
grant select on table public.catalogue_officiel to authenticated;

drop policy if exists catalogue_officiel_select on public.catalogue_officiel;
create policy catalogue_officiel_select on public.catalogue_officiel
  for select to authenticated
  using (true);
