-- Passe le mode souhaité en vigueur dès que la date est atteinte.
create or replace function public.appliquer_modes_du_jour()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  tz text;
  jour date;
begin
  if uid is null then
    return;
  end if;
  select timezone into tz from public.profiles where id = uid;
  jour := public.jour_local(now(), coalesce(nullif(tz, ''), 'Europe/Paris'));
  update public.user_skill_choices
     set mode_en_vigueur = mode
   where user_id = uid
     and mode_depuis <= jour
     and mode_en_vigueur is distinct from mode;
end;
$$;

revoke all on function public.appliquer_modes_du_jour() from public, anon;
grant execute on function public.appliquer_modes_du_jour() to authenticated;
