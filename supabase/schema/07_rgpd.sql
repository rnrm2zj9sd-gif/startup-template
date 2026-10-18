-- Suppression de compte : xp_events doit suivre auth.users.
do $$
declare r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname = 'xp_events' and c.contype = 'f'
      and pg_get_constraintdef(c.oid) ilike '%auth.users%'
  loop
    execute format('alter table public.xp_events drop constraint %I', r.conname);
  end loop;
  alter table public.xp_events
    add constraint xp_events_user_id_fkey
    foreign key (user_id) references auth.users (id) on delete cascade;
end $$;

create or replace function public.supprimer_mon_compte()
returns void
language plpgsql
security definer
set search_path to public, auth, pg_temp
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'non authentifié' using errcode = '42501';
  end if;
  delete from public.players where user_id = uid::text;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.supprimer_mon_compte() from public, anon;
grant execute on function public.supprimer_mon_compte() to authenticated;

select kind, nom, present from (
  select 'contrainte'::text as kind, 'xp_events.user_id ON DELETE CASCADE'::text as nom,
    exists (
      select 1 from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      where t.relname = 'xp_events' and c.contype = 'f'
        and pg_get_constraintdef(c.oid) ilike '%on delete cascade%'
    ) as present
  union all
  select 'fonction', 'supprimer_mon_compte',
    exists (select 1 from pg_proc where oid = 'public.supprimer_mon_compte()'::regprocedure)
) v;
