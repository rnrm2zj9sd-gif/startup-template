-- _vm_progresser (interne à validate_mission) : paliers des focus (4 paliers = 1 niveau, max 5).
create or replace function public._vm_progresser(
  p_uid uuid,
  p_competence text,
  p_focus jsonb,
  p_delta integer
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_focus text;
  niv integer;
  pal integer;
begin
  if p_delta <> 0 and p_competence is not null then
    for v_focus in
      select jsonb_array_elements_text(coalesce(p_focus, '[]'::jsonb))
    loop
      insert into public.skill_progress as sp (user_id, competence_id, focus_id, niveau, palier)
      values (p_uid, p_competence, v_focus, 1, 0)
      on conflict (user_id, competence_id, focus_id) do nothing;

      select sp.niveau, sp.palier into niv, pal
      from public.skill_progress sp
      where sp.user_id = p_uid and sp.competence_id = p_competence and sp.focus_id = v_focus
      for update;

      pal := pal + p_delta;
      while pal >= 4 loop
        if niv >= 5 then
          pal := 3;
          exit;
        end if;
        niv := niv + 1;
        pal := pal - 4;
      end loop;
      if pal < 0 then
        if niv > 1 then
          niv := niv - 1;
          pal := 2;
        else
          pal := 0;
        end if;
      end if;

      update public.skill_progress sp
      set niveau = niv, palier = pal
      where sp.user_id = p_uid and sp.competence_id = p_competence and sp.focus_id = v_focus;
    end loop;
  end if;
end;
$$;

revoke all on function public._vm_progresser(uuid, text, jsonb, integer) from public, anon, authenticated;
