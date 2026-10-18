-- Mode souhaité vs mode en vigueur (effet dès demain). Rejouable.
alter table public.user_skill_choices
  add column if not exists mode_en_vigueur text;

alter table public.user_skill_choices
  add column if not exists mode_depuis date;

update public.user_skill_choices
   set mode_en_vigueur = coalesce(nullif(mode_en_vigueur, ''), mode, 'guide'),
       mode_depuis = coalesce(mode_depuis, current_date)
 where mode_en_vigueur is null or mode_depuis is null;

alter table public.user_skill_choices
  alter column mode_en_vigueur set default 'guide';
alter table public.user_skill_choices
  alter column mode_en_vigueur set not null;
alter table public.user_skill_choices
  alter column mode_depuis set default current_date;
alter table public.user_skill_choices
  alter column mode_depuis set not null;

do $$ begin
  alter table public.user_skill_choices
    add constraint user_skill_choices_mode_en_vigueur_check
    check (mode_en_vigueur in ('guide', 'mixte', 'libre'));
exception when duplicate_object then null;
end $$;
