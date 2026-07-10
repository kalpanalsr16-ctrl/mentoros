-- MentorOS M5A: Curriculum Foundation schema.
-- Normalized relational implementation of 09_Curriculum_Foundation.md's
-- model (Part A: Curriculum Structure, Part B: Pedagogical Knowledge,
-- Part C: Content Metadata). Replaces M3's static, in-code dataset.
--
-- Text primary keys (not uuid) are used throughout this schema,
-- deliberately unlike profiles/conversations/messages/events -- curriculum
-- content is authored, versioned reference data where stable, human-
-- readable IDs (e.g. "addition-with-regrouping") matter for content
-- authoring and cross-referencing, unlike runtime user data.
--
-- All tables are read-only from the app's perspective: RLS grants SELECT
-- to any authenticated student (curriculum content is shared reference
-- data, not per-student data), with no INSERT/UPDATE/DELETE policy --
-- content authoring happens via migrations/seed scripts run with direct
-- database access, not through the app's RLS-scoped client.

create extension if not exists pg_trgm;

-- ============================================================
-- Shared content metadata columns, per 09_Curriculum_Foundation.md Part C.
-- Repeated inline on each table below (Postgres has no column mixins)
-- rather than a separate metadata table, to keep reads a single query.
-- ============================================================

-- ============================================================
-- subjects
-- ============================================================
create table public.subjects (
  id text primary key,
  name text not null,
  curriculum_standard text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subjects enable row level security;

create policy "Authenticated users can read subjects"
  on public.subjects for select
  to authenticated
  using (true);

-- ============================================================
-- grades
-- ============================================================
create table public.grades (
  id text primary key,
  subject_id text not null references public.subjects (id) on delete cascade,
  grade_level text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index grades_subject_id_idx on public.grades (subject_id);

alter table public.grades enable row level security;

create policy "Authenticated users can read grades"
  on public.grades for select
  to authenticated
  using (true);

-- ============================================================
-- chapters
-- ============================================================
create table public.chapters (
  id text primary key,
  grade_id text not null references public.grades (id) on delete cascade,
  title text not null,
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

create index chapters_grade_id_idx on public.chapters (grade_id);

alter table public.chapters enable row level security;

create policy "Authenticated users can read chapters"
  on public.chapters for select
  to authenticated
  using (true);

-- ============================================================
-- concepts
-- The core node of the knowledge graph.
-- ============================================================
create table public.concepts (
  id text primary key,
  chapter_id text references public.chapters (id) on delete set null,
  name text not null,
  description text not null,
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

create index concepts_chapter_id_idx on public.concepts (chapter_id);

-- Trigram index backing search_concept_id()'s similarity() fallback below.
create index concepts_name_trgm_idx
  on public.concepts using gin (name gin_trgm_ops);

alter table public.concepts enable row level security;

create policy "Authenticated users can read concepts"
  on public.concepts for select
  to authenticated
  using (true);

-- ============================================================
-- concept_relationships
-- The knowledge-graph edges. relationship_type is an open text value,
-- not an enum -- new relationship kinds are additive rows in future
-- data, not a schema change (see 09_Curriculum_Foundation.md, A7).
-- ============================================================
create table public.concept_relationships (
  from_concept_id text not null references public.concepts (id) on delete cascade,
  to_concept_id text not null references public.concepts (id) on delete cascade,
  relationship_type text not null
    check (relationship_type in ('prerequisite_of', 'builds_on', 'related_to', 'part_of')),
  version int not null default 1,
  status text not null default 'published'
    check (status in ('draft', 'published', 'deprecated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (from_concept_id, to_concept_id, relationship_type)
);

create index concept_relationships_to_concept_idx
  on public.concept_relationships (to_concept_id, relationship_type);

alter table public.concept_relationships enable row level security;

create policy "Authenticated users can read concept relationships"
  on public.concept_relationships for select
  to authenticated
  using (true);

-- ============================================================
-- learning_objectives
-- First-class entities, not fields on concepts (09_Curriculum_Foundation.md, A5).
-- ============================================================
create table public.learning_objectives (
  id text primary key,
  statement text not null,
  blooms_level text not null
    check (blooms_level in ('Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create')),
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

alter table public.learning_objectives enable row level security;

create policy "Authenticated users can read learning objectives"
  on public.learning_objectives for select
  to authenticated
  using (true);

-- ============================================================
-- concept_learning_objectives
-- Many-to-many join: a concept usually has several objectives, and an
-- integrative objective can span more than one concept.
-- ============================================================
create table public.concept_learning_objectives (
  concept_id text not null references public.concepts (id) on delete cascade,
  learning_objective_id text not null references public.learning_objectives (id) on delete cascade,
  primary key (concept_id, learning_objective_id)
);

create index concept_learning_objectives_objective_idx
  on public.concept_learning_objectives (learning_objective_id);

alter table public.concept_learning_objectives enable row level security;

create policy "Authenticated users can read concept-objective links"
  on public.concept_learning_objectives for select
  to authenticated
  using (true);

-- ============================================================
-- misconceptions (Pedagogical Knowledge, Part B1)
-- Carries the narrower Pedagogical Knowledge metadata profile
-- (09_Curriculum_Foundation.md, Part C2): version/status/source/
-- last_reviewed_by, but deliberately no curriculum_standard_reference
-- or effective_from/effective_until -- a misconception isn't an
-- artifact of a specific syllabus edition the way a Concept is.
-- ============================================================
create table public.misconceptions (
  id text primary key,
  concept_id text not null references public.concepts (id) on delete cascade,
  description text not null,
  common_triggers text,
  version int not null default 1,
  status text not null default 'published'
    check (status in ('draft', 'published', 'deprecated')),
  source text,
  last_reviewed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index misconceptions_concept_id_idx on public.misconceptions (concept_id);

alter table public.misconceptions enable row level security;

create policy "Authenticated users can read misconceptions"
  on public.misconceptions for select
  to authenticated
  using (true);

-- ============================================================
-- teaching_strategies (Pedagogical Knowledge, Part B3)
-- Narrower Pedagogical Knowledge metadata profile, same rationale as
-- misconceptions above (09_Curriculum_Foundation.md, Part C2).
-- ============================================================
create table public.teaching_strategies (
  id text primary key,
  concept_id text not null references public.concepts (id) on delete cascade,
  description text not null,
  when_to_use text,
  version int not null default 1,
  status text not null default 'published'
    check (status in ('draft', 'published', 'deprecated')),
  source text,
  last_reviewed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index teaching_strategies_concept_id_idx on public.teaching_strategies (concept_id);

alter table public.teaching_strategies enable row level security;

create policy "Authenticated users can read teaching strategies"
  on public.teaching_strategies for select
  to authenticated
  using (true);

-- ============================================================
-- mastery_criteria (Pedagogical Knowledge, Part B4)
-- Attached to learning objectives, not concepts -- mastery is only
-- concrete relative to a specific measurable statement. Narrower
-- Pedagogical Knowledge metadata profile, same rationale as
-- misconceptions above (09_Curriculum_Foundation.md, Part C2).
-- ============================================================
create table public.mastery_criteria (
  id text primary key,
  learning_objective_id text not null references public.learning_objectives (id) on delete cascade,
  evidence_required text not null,
  version int not null default 1,
  status text not null default 'published'
    check (status in ('draft', 'published', 'deprecated')),
  source text,
  last_reviewed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index mastery_criteria_objective_id_idx on public.mastery_criteria (learning_objective_id);

alter table public.mastery_criteria enable row level security;

create policy "Authenticated users can read mastery criteria"
  on public.mastery_criteria for select
  to authenticated
  using (true);

-- ============================================================
-- search_concept_id: M5B's trigram-backed concept search.
-- Exact case-insensitive name match first (preserving M3's original
-- matching behavior), falling back to trigram similarity for a
-- fuzzy/paraphrased topic. Real semantic (embedding-based) search is
-- deliberately deferred -- see 09_Curriculum_Foundation.md and the M5
-- gate review for why.
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
