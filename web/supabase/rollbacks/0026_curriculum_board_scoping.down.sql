-- Rollback for 0026_curriculum_board_scoping.sql.
-- Order is the exact reverse of 0026's create order, so each step only
-- ever depends on objects not yet dropped. Restores search_concept_id
-- to its original (0002) body rather than dropping it -- 0002's own
-- migration is not being rolled back here, so the function must
-- continue to exist, just without 0026's status filter.

create or replace function public.search_concept_id(
  search_topic text,
  search_subtopic text default null
)
returns text
language plpgsql
stable
as $$
declare
  result_id text;
  target text;
begin
  target := coalesce(search_subtopic, search_topic);
  if target is null or length(trim(target)) = 0 then
    return null;
  end if;

  select id into result_id
  from public.concepts
  where lower(name) = lower(target)
  limit 1;

  if result_id is not null then
    return result_id;
  end if;

  select id into result_id
  from public.concepts
  where similarity(name, target) > 0.3
  order by similarity(name, target) desc
  limit 1;

  return result_id;
end;
$$;

drop table if exists public.subconcepts;

alter table public.subjects drop column if exists board_id;

drop table if exists public.boards;
