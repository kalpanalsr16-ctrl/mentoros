-- MentorOS Phase 1 (Curriculum Platform Evolution): Board-scoped curriculum.
-- Adds a `boards` entity above `subjects` (Board -> Subject -> Grade ->
-- Chapter -> Concept -> Subconcept), per the approved decision to keep
-- the existing Subject->Grade FK direction rather than perform a
-- breaking inversion. A subject belongs to exactly one board; the same
-- subject name under two boards (e.g. "Mathematics" under NCERT/CBSE vs
-- ICSE) is modeled as two separate `subjects` rows, each with its own
-- board_id, each owning its own grades/chapters/concepts subtree -- not
-- a shared subject row. A future canonical concept-mapping layer (for
-- sharing mastery semantics across boards) is intentionally NOT built
-- here; concept_relationships' existing open `relationship_type` enum
-- leaves room to add a cross-board mapping edge type later without a
-- schema change.
--
-- Also adds `subconcepts`, the next level below `concepts` in the
-- target hierarchy -- created empty here; no seed data references it
-- yet (09_Curriculum_Foundation.md's granularity below Concept is
-- Learning Objective, not Sub-concept, so this is a genuinely new
-- layer, not a rename of something that already existed).

-- ============================================================
-- boards
-- ============================================================
create table public.boards (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.boards enable row level security;

create policy "Authenticated users can read boards"
  on public.boards for select
  to authenticated
  using (true);

insert into public.boards (id, name) values
  ('ncert-cbse', 'NCERT / CBSE'),
  ('icse', 'ICSE');

-- ============================================================
-- subjects.board_id
-- Added nullable, backfilled, then constrained not null in the same
-- migration -- safe because this table has exactly one existing row
-- today ('mathematics'). No `on delete cascade` here, unlike the
-- chapter/concept parent-child FKs: boards is reference/lookup data,
-- not a content-ownership parent, so a board should never be
-- deletable while subjects still reference it (default RESTRICT).
-- ============================================================
alter table public.subjects
  add column board_id text references public.boards (id);

update public.subjects set board_id = 'ncert-cbse' where id = 'mathematics';

alter table public.subjects
  alter column board_id set not null;

create index subjects_board_id_idx on public.subjects (board_id);

-- ============================================================
-- subconcepts
-- Same content-metadata profile as concepts/chapters (Curriculum
-- Structure, not Pedagogical Knowledge -- 09_Curriculum_Foundation.md
-- Part A vs Part B), since a subconcept is a structural node, not
-- pedagogical metadata about one.
-- ============================================================
create table public.subconcepts (
  id text primary key,
  concept_id text not null references public.concepts (id) on delete cascade,
  name text not null,
  description text not null,
  sequence smallint not null default 1,
  version int not null default 1,
  status text not null default 'published'
    check (status in ('draft', 'published', 'deprecated')),
  curriculum_standard_reference text,
  source text,
  effective_from date,
  effective_until date,
  last_reviewed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subconcepts_concept_id_idx on public.subconcepts (concept_id);

alter table public.subconcepts enable row level security;

create policy "Authenticated users can read subconcepts"
  on public.subconcepts for select
  to authenticated
  using (true);

-- ============================================================
-- search_concept_id: close a status-visibility gap.
-- The 0002 version matched against ALL concepts regardless of status,
-- because every concept in the schema was 'published' at the time.
-- Phase 1 seeds new concepts as 'draft' specifically so they stay
-- invisible to the live product while under construction -- that
-- guarantee only holds if this function (the one place free-text
-- student input resolves to a concept id, via
-- TrigramConceptSearchProvider.findConceptIdByTopic) also respects
-- status. This is a no-op for every existing concept (all currently
-- 'published').
-- ============================================================
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
    and status = 'published'
  limit 1;

  if result_id is not null then
    return result_id;
  end if;

  select id into result_id
  from public.concepts
  where similarity(name, target) > 0.3
    and status = 'published'
  order by similarity(name, target) desc
  limit 1;

  return result_id;
end;
$$;
