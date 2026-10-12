-- THEMILION SYSTEM — lot 2 / fichier 4 (tests)
-- Coller APRÈS 0001, 0002, 0003. SQL Editor → New query → Run.
-- Crée les utilisateurs A et B, vérifie RLS, UNIQUE, cascade, puis les supprime.
-- Le tableau final : toutes les lignes doivent avoir ok = true.

create table if not exists public._lot2_report (
  id integer generated always as identity primary key,
  test text not null,
  ok boolean not null,
  detail text not null default ''
);
truncate public._lot2_report;
alter table public._lot2_report disable row level security;
grant all on public._lot2_report to authenticated, anon;
do $$ begin
  execute format(
    'grant usage, select on sequence %s to authenticated, anon',
    pg_get_serial_sequence('public._lot2_report', 'id')
  );
exception when others then null;
end $$;

create or replace function public._lot2_try(sql text)
returns text
language plpgsql
as $$
begin
  execute sql;
  return 'OK';
exception when others then
  return sqlstate || ' ' || sqlerrm;
end;
$$;

create or replace function public._lot2_create_auth_user(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
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
    p_email,
    crypt('lot2-test', gen_salt('bf')),
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
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(),
      uid,
      jsonb_build_object('sub', uid::text, 'email', p_email),
      'email',
      uid::text,
      now(),
      now(),
      now()
    );
  exception when others then
    begin
      insert into auth.identities (
        user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
      ) values (
        uid,
        jsonb_build_object('sub', uid::text, 'email', p_email),
        'email',
        p_email,
        now(),
        now(),
        now()
      );
    exception when others then
      null;
    end;
  end;

  return uid;
end;
$$;

-- Nettoyage d’un run précédent
delete from auth.users where email in ('lot2-a@themilion.test', 'lot2-b@themilion.test');

insert into public.achievements (id, titre, condition)
values ('lot2_test', 'Lot 2', 'test')
on conflict (id) do nothing;

select set_config('lot2.a', public._lot2_create_auth_user('lot2-a@themilion.test')::text, false);
select set_config('lot2.b', public._lot2_create_auth_user('lot2-b@themilion.test')::text, false);

-- Données de B (et un peu de A) en tant que postgres (bypass RLS)
insert into public.profiles (id, pseudo)
values (current_setting('lot2.a')::uuid, 'Alice')
on conflict (id) do update set pseudo = excluded.pseudo;

insert into public.profiles (id, pseudo)
values (current_setting('lot2.b')::uuid, 'Bob')
on conflict (id) do update set pseudo = excluded.pseudo;

insert into public.goals (user_id, titre, description, categorie, statut)
values
  (current_setting('lot2.a')::uuid, 'Goal A', '', 'Sport', 'en_cours'),
  (current_setting('lot2.b')::uuid, 'Goal B', '', 'Finance', 'en_cours');

insert into public.user_skill_choices (user_id, competence_id, focus_ids, seances_semaine, minutes_max, mode)
values
  (current_setting('lot2.a')::uuid, 'musculation', '{}', 3, 30, 'guide'),
  (current_setting('lot2.b')::uuid, 'musculation', '{}', 3, 30, 'guide');

insert into public.custom_catalog (user_id, data)
values
  (current_setting('lot2.a')::uuid, '{"owner":"A"}'::jsonb),
  (current_setting('lot2.b')::uuid, '{"owner":"B"}'::jsonb)
on conflict (user_id) do update set data = excluded.data;

insert into public.missions (
  user_id, date_locale, type, domaine, competence_id, titre, description,
  duree_min, difficulte, payload, xp_prevu, statut
) values
  (current_setting('lot2.a')::uuid, '2026-10-12', 'daily', 'fitness', 'musculation', 'Mission A', '', 20, 'moyen', '{}', 10, 'a_faire'),
  (current_setting('lot2.b')::uuid, '2026-10-12', 'daily', 'finance', 'budget', 'Mission B', '', 20, 'moyen', '{}', 10, 'a_faire');

select set_config(
  'lot2.mission_a',
  (select id::text from public.missions where user_id = current_setting('lot2.a')::uuid limit 1),
  false
);
select set_config(
  'lot2.mission_b',
  (select id::text from public.missions where user_id = current_setting('lot2.b')::uuid limit 1),
  false
);

insert into public.mission_validations (user_id, mission_id, ressenti, note)
values
  (current_setting('lot2.a')::uuid, current_setting('lot2.mission_a')::uuid, 'bien', ''),
  (current_setting('lot2.b')::uuid, current_setting('lot2.mission_b')::uuid, 'bien', '');

insert into public.skill_progress (user_id, competence_id, focus_id, niveau, palier)
values
  (current_setting('lot2.a')::uuid, 'musculation', 'abdos', 1, 0),
  (current_setting('lot2.b')::uuid, 'musculation', 'abdos', 2, 0);

insert into public.xp_ledger (user_id, mission_id, montant, raison, domaine)
values
  (current_setting('lot2.a')::uuid, current_setting('lot2.mission_a')::uuid, 10, 'test A', 'fitness'),
  (current_setting('lot2.b')::uuid, current_setting('lot2.mission_b')::uuid, 10, 'test B', 'finance');

insert into public.system_log (user_id, type, payload)
values
  (current_setting('lot2.a')::uuid, 'test', '{"u":"A"}'::jsonb),
  (current_setting('lot2.b')::uuid, 'test', '{"u":"B"}'::jsonb);

insert into public.user_achievements (user_id, achievement_id)
values
  (current_setting('lot2.a')::uuid, 'lot2_test'),
  (current_setting('lot2.b')::uuid, 'lot2_test');

insert into public.subscriptions (user_id, statut, plan)
values
  (current_setting('lot2.a')::uuid, 'free', 'free'),
  (current_setting('lot2.b')::uuid, 'free', 'free');

-- Trigger profil
insert into public._lot2_report (test, ok, detail)
select
  'trigger profil A',
  exists (select 1 from public.profiles where id = current_setting('lot2.a')::uuid),
  '';

insert into public._lot2_report (test, ok, detail)
select
  'trigger profil B',
  exists (select 1 from public.profiles where id = current_setting('lot2.b')::uuid),
  '';

-- ---------------------------------------------------------------------------
-- Impersonation A
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', current_setting('lot2.a'), false);
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('lot2.a'), 'role', 'authenticated', 'email', 'lot2-a@themilion.test')::text,
  false
);
set role authenticated;

insert into public._lot2_report (test, ok, detail)
select 'A lit son profil', count(*) = 1, count(*)::text
from public.profiles where id = current_setting('lot2.a')::uuid;

insert into public._lot2_report (test, ok, detail)
select 'A ne lit pas profil B', count(*) = 0, count(*)::text
from public.profiles where id = current_setting('lot2.b')::uuid;

with u as (
  update public.profiles set pseudo = 'hack' where id = current_setting('lot2.b')::uuid returning id
)
insert into public._lot2_report (test, ok, detail)
select 'A ne modifie pas profil B', (select count(*) from u) = 0, '';

insert into public._lot2_report (test, ok, detail)
select 'A lit ses goals', count(*) >= 1, count(*)::text
from public.goals where user_id = current_setting('lot2.a')::uuid;

insert into public._lot2_report (test, ok, detail)
select 'A ne lit pas goals B', count(*) = 0, count(*)::text
from public.goals where user_id = current_setting('lot2.b')::uuid;

with u as (
  update public.goals set titre = 'hack' where user_id = current_setting('lot2.b')::uuid returning id
)
insert into public._lot2_report (test, ok, detail)
select 'A ne modifie pas goals B', (select count(*) from u) = 0, '';

insert into public._lot2_report (test, ok, detail)
select 'A ne lit pas skill_choices B', count(*) = 0, count(*)::text
from public.user_skill_choices where user_id = current_setting('lot2.b')::uuid;

with u as (
  update public.user_skill_choices set minutes_max = 99 where user_id = current_setting('lot2.b')::uuid returning id
)
insert into public._lot2_report (test, ok, detail)
select 'A ne modifie pas skill_choices B', (select count(*) from u) = 0, '';

insert into public._lot2_report (test, ok, detail)
select 'A ne lit pas custom_catalog B', count(*) = 0, count(*)::text
from public.custom_catalog where user_id = current_setting('lot2.b')::uuid;

with u as (
  update public.custom_catalog set data = '{"hack":true}'::jsonb where user_id = current_setting('lot2.b')::uuid returning user_id
)
insert into public._lot2_report (test, ok, detail)
select 'A ne modifie pas custom_catalog B', (select count(*) from u) = 0, '';

insert into public._lot2_report (test, ok, detail)
select 'A ne lit pas missions B', count(*) = 0, count(*)::text
from public.missions where user_id = current_setting('lot2.b')::uuid;

with u as (
  update public.missions set titre = 'hack' where user_id = current_setting('lot2.b')::uuid returning id
)
insert into public._lot2_report (test, ok, detail)
select 'A ne modifie pas missions B', (select count(*) from u) = 0, '';

insert into public._lot2_report (test, ok, detail)
select 'A ne lit pas validations B', count(*) = 0, count(*)::text
from public.mission_validations where user_id = current_setting('lot2.b')::uuid;

insert into public._lot2_report (test, ok, detail)
select 'A ne lit pas skill_progress B', count(*) = 0, count(*)::text
from public.skill_progress where user_id = current_setting('lot2.b')::uuid;

insert into public._lot2_report (test, ok, detail)
select 'A ne lit pas xp_ledger B', count(*) = 0, count(*)::text
from public.xp_ledger where user_id = current_setting('lot2.b')::uuid;

insert into public._lot2_report (test, ok, detail)
select 'A ne lit pas system_log B', count(*) = 0, count(*)::text
from public.system_log where user_id = current_setting('lot2.b')::uuid;

insert into public._lot2_report (test, ok, detail)
select 'A ne lit pas user_achievements B', count(*) = 0, count(*)::text
from public.user_achievements where user_id = current_setting('lot2.b')::uuid;

insert into public._lot2_report (test, ok, detail)
select 'A ne lit pas subscriptions B', count(*) = 0, count(*)::text
from public.subscriptions where user_id = current_setting('lot2.b')::uuid;

insert into public._lot2_report (test, ok, detail)
select 'A lit achievements (global)', count(*) >= 1, count(*)::text
from public.achievements;

insert into public._lot2_report (test, ok, detail)
select 'A ne peut pas inserer xp_ledger', r.msg not like 'OK%', r.msg
from (
  select public._lot2_try(
    format(
      $q$insert into public.xp_ledger (user_id, montant, raison, domaine) values (%L, 10, 'hack', 'mind')$q$,
      current_setting('lot2.a')
    )
  ) as msg
) r;

insert into public._lot2_report (test, ok, detail)
select 'A ne peut pas passer is_admin', r.msg not like 'OK%', r.msg
from (
  select public._lot2_try(
    format($q$update public.profiles set is_admin = true where id = %L$q$, current_setting('lot2.a'))
  ) as msg
) r;

reset role;

-- UNIQUE mission_validations (côté base, pas RLS)
insert into public._lot2_report (test, ok, detail)
select '2e validation meme mission refusee', r.msg not like 'OK%', r.msg
from (
  select public._lot2_try(
    format(
      $q$insert into public.mission_validations (user_id, mission_id, ressenti) values (%L, %L, 'bien')$q$,
      current_setting('lot2.a'),
      current_setting('lot2.mission_a')
    )
  ) as msg
) r;

insert into public._lot2_report (test, ok, detail)
select 'xp_ledger update refuse', r.msg not like 'OK%', r.msg
from (
  select public._lot2_try('update public.xp_ledger set montant = 99') as msg
) r;

-- Cascade : supprimer A
delete from auth.users where id = current_setting('lot2.a')::uuid;

insert into public._lot2_report (test, ok, detail)
select 'cascade profiles A', not exists (select 1 from public.profiles where id = current_setting('lot2.a')::uuid), '';

insert into public._lot2_report (test, ok, detail)
select 'cascade goals A', not exists (select 1 from public.goals where user_id = current_setting('lot2.a')::uuid), '';

insert into public._lot2_report (test, ok, detail)
select 'cascade skill_choices A', not exists (select 1 from public.user_skill_choices where user_id = current_setting('lot2.a')::uuid), '';

insert into public._lot2_report (test, ok, detail)
select 'cascade custom_catalog A', not exists (select 1 from public.custom_catalog where user_id = current_setting('lot2.a')::uuid), '';

insert into public._lot2_report (test, ok, detail)
select 'cascade missions A', not exists (select 1 from public.missions where user_id = current_setting('lot2.a')::uuid), '';

insert into public._lot2_report (test, ok, detail)
select 'cascade validations A', not exists (select 1 from public.mission_validations where user_id = current_setting('lot2.a')::uuid), '';

insert into public._lot2_report (test, ok, detail)
select 'cascade skill_progress A', not exists (select 1 from public.skill_progress where user_id = current_setting('lot2.a')::uuid), '';

insert into public._lot2_report (test, ok, detail)
select 'cascade xp_ledger A', not exists (select 1 from public.xp_ledger where user_id = current_setting('lot2.a')::uuid), '';

insert into public._lot2_report (test, ok, detail)
select 'cascade system_log A', not exists (select 1 from public.system_log where user_id = current_setting('lot2.a')::uuid), '';

insert into public._lot2_report (test, ok, detail)
select 'cascade user_achievements A', not exists (select 1 from public.user_achievements where user_id = current_setting('lot2.a')::uuid), '';

insert into public._lot2_report (test, ok, detail)
select 'cascade subscriptions A', not exists (select 1 from public.subscriptions where user_id = current_setting('lot2.a')::uuid), '';

-- B encore là, puis suppression
insert into public._lot2_report (test, ok, detail)
select 'B toujours present avant delete', exists (select 1 from public.profiles where id = current_setting('lot2.b')::uuid), '';

delete from auth.users where id = current_setting('lot2.b')::uuid;

insert into public._lot2_report (test, ok, detail)
select 'cascade profiles B', not exists (select 1 from public.profiles where id = current_setting('lot2.b')::uuid), '';

delete from public.achievements where id = 'lot2_test';

drop function if exists public._lot2_create_auth_user(text);
drop function if exists public._lot2_try(text);

-- Résultat à lire : toutes les lignes ok = true
-- (tu peux ensuite exécuter : drop table if exists public._lot2_report;)
select test, ok, detail from public._lot2_report order by id;
