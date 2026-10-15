-- Lot 2 / test 5 — cascade.
-- SQL Editor → New query → coller tout → Run.
-- Relançable. Ne touche pas aux comptes A et B.
-- Attendu : toutes les colonnes remaining_* = 0.

create extension if not exists pgcrypto;

create or replace function public._lot2_cascade_tmp_user()
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    uid,
    'authenticated',
    'authenticated',
    'lot2-cascade@themilion.test',
    crypt('lot2-cascade', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );
  begin
    insert into auth.identities (
      user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) values (
      uid,
      jsonb_build_object('sub', uid::text, 'email', 'lot2-cascade@themilion.test'),
      'email',
      uid::text,
      now(),
      now(),
      now()
    );
  exception when others then
    null;
  end;
  return uid;
end;
$$;

delete from auth.users where email = 'lot2-cascade@themilion.test';

select set_config('lot2.cascade_uid', public._lot2_cascade_tmp_user()::text, false);

insert into public.profiles (id, pseudo)
values (current_setting('lot2.cascade_uid')::uuid, 'cascade')
on conflict (id) do update set pseudo = excluded.pseudo;

insert into public.goals (user_id, titre, description, categorie, statut)
values (current_setting('lot2.cascade_uid')::uuid, 'cascade', 'lot2-cascade', 'Sport', 'en_cours');

insert into public.missions (
  user_id, date_locale, type, domaine, competence_id, titre, description,
  duree_min, difficulte, payload, xp_prevu, statut
) values (
  current_setting('lot2.cascade_uid')::uuid, current_date, 'daily', 'mind', 'cascade',
  'cascade', 'lot2-cascade', 10, 'moyen', '{}', 1, 'a_faire'
);

insert into public.user_skill_choices (user_id, competence_id, focus_ids, seances_semaine, minutes_max, mode)
values (current_setting('lot2.cascade_uid')::uuid, 'cascade', '{}', 1, 10, 'guide');

insert into public.custom_catalog (user_id, data)
values (current_setting('lot2.cascade_uid')::uuid, '{"mark":"lot2-cascade"}'::jsonb)
on conflict (user_id) do update set data = excluded.data;

insert into public.xp_ledger (user_id, montant, raison, domaine)
values (current_setting('lot2.cascade_uid')::uuid, 1, 'lot2-cascade', 'mind');

insert into public.system_log (user_id, type, payload)
values (current_setting('lot2.cascade_uid')::uuid, 'lot2-cascade', '{}'::jsonb);

delete from auth.users where id = current_setting('lot2.cascade_uid')::uuid;

select
  (select count(*) from public.profiles where id = current_setting('lot2.cascade_uid')::uuid) as remaining_profiles,
  (select count(*) from public.goals where user_id = current_setting('lot2.cascade_uid')::uuid) as remaining_goals,
  (select count(*) from public.missions where user_id = current_setting('lot2.cascade_uid')::uuid) as remaining_missions,
  (select count(*) from public.user_skill_choices where user_id = current_setting('lot2.cascade_uid')::uuid) as remaining_skill_choices,
  (select count(*) from public.custom_catalog where user_id = current_setting('lot2.cascade_uid')::uuid) as remaining_catalog,
  (select count(*) from public.xp_ledger where user_id = current_setting('lot2.cascade_uid')::uuid) as remaining_ledger,
  (select count(*) from public.system_log where user_id = current_setting('lot2.cascade_uid')::uuid) as remaining_log;

drop function if exists public._lot2_cascade_tmp_user();
