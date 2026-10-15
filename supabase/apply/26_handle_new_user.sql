-- handle_new_user : profil créé à l'inscription, avec le genre lu dans les métadonnées.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  g text;
begin
  g := lower(trim(coalesce(new.raw_user_meta_data->>'gender', '')));
  if g not in ('male', 'female') then
    g := 'male';
  end if;

  insert into public.profiles (id, pseudo, timezone, onboarding_done, is_admin, gender)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'pseudo'), ''),
      split_part(new.email, '@', 1),
      'joueur'
    ),
    'Europe/Paris',
    false,
    false,
    g
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
