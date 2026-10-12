-- Lot 2 / test 3 — la contrainte UNIQUE existe-t-elle ?
-- SQL Editor → New query → Run.
-- Attendu : 1 ligne (index ou contrainte sur mission_id).

select
  c.relname as index_name,
  pg_get_indexdef(i.indexrelid) as definition
from pg_index i
join pg_class c on c.oid = i.indexrelid
join pg_class t on t.oid = i.indrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'mission_validations'
  and i.indisunique
  and pg_get_indexdef(i.indexrelid) ilike '%mission_id%';
