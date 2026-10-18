-- Remplacer : l'ancienne daily annulée n'occupe plus la place.
-- Libre : les missions ajoutées (payload.source = libre) n'entrent pas dans l'unicité par compétence.
drop index if exists public.missions_user_date_competence_daily_uidx;

create unique index if not exists missions_user_date_competence_daily_uidx
  on public.missions (user_id, date_locale, competence_id)
  where type = 'daily'
    and statut <> 'annulee'
    and coalesce(payload->>'source', '') <> 'libre';
