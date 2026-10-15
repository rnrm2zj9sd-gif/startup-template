-- jour_local : date civile d'un instant dans le fuseau du joueur (défaut Europe/Paris).
create or replace function public.jour_local(p_ts timestamptz, p_tz text)
returns date
language sql
immutable
as $$
  select (p_ts at time zone coalesce(nullif(p_tz, ''), 'Europe/Paris'))::date;
$$;

revoke all on function public.jour_local(timestamptz, text) from public, anon;
grant execute on function public.jour_local(timestamptz, text) to authenticated;
