-- Index unique : une mission daily par joueur, par jour et par compétence.
create unique index if not exists missions_user_date_competence_daily_uidx
  on public.missions (user_id, date_locale, competence_id)
  where type = 'daily';
