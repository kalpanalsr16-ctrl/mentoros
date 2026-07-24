-- Epic G9 (Assessment Builder) -- docs/ui-architecture/03_Teacher_Studio.md's
-- "New schema this experience requires" section: `assessments_authored`,
-- static content a teacher builds ahead of time -- distinct from
-- Assessment Agent's live, per-turn runtime evaluation (assessment_completed
-- events), which this table never reads from or writes to.
--
-- RLS shape matches 0011_classes.sql exactly (a plain per-owner table,
-- teacher_id = auth.uid()) -- classes/lesson_plans/assessments_authored
-- all use this identical shape per the doc's own note. Delete is
-- included here (unlike classes, which has none) since deleting a draft
-- assessment is a normal authoring action with no downstream roster
-- data to orphan.
--
-- `questions` is jsonb; its internal shape ({id, text, points}[]) is an
-- implementation-time decision -- 03_Teacher_Studio.md specifies only
-- the column name/type, not its structure. Validated at the application
-- layer (assessment-builder-aggregation.ts), not by a jsonb schema
-- constraint, matching this codebase's existing convention for other
-- jsonb payload columns (events.payload, achievements_earned.metadata).
--
-- Assigning/distributing an authored assessment to students is
-- explicitly out of scope (03_Teacher_Studio.md's own "Future
-- integrations" note: "needs a distribution/assignment model, not
-- designed here") -- this migration only proves the authoring data
-- shape, same as H1/H2 did for Parent Portal's data-shape-only phase.

create table public.assessments_authored (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assessments_authored_teacher_id_idx on public.assessments_authored (teacher_id);

alter table public.assessments_authored enable row level security;

create policy "Teachers can view their own authored assessments"
  on public.assessments_authored for select
  using (teacher_id = auth.uid());

create policy "Teachers can create their own authored assessments"
  on public.assessments_authored for insert
  with check (teacher_id = auth.uid());

create policy "Teachers can update their own authored assessments"
  on public.assessments_authored for update
  using (teacher_id = auth.uid());

create policy "Teachers can delete their own authored assessments"
  on public.assessments_authored for delete
  using (teacher_id = auth.uid());
