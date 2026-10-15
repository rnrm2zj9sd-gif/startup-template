-- xp_total_of : somme de l'XP d'un joueur dans xp_ledger.
create or replace function public.xp_total_of(p_user_id uuid)
returns integer
language sql
stable
as $$
  select coalesce(sum(montant), 0)::integer from public.xp_ledger where user_id = p_user_id;
$$;
