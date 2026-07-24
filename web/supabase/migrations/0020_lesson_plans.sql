-- Epic G8 (Lesson Planner) -- docs/ui-architecture/03_Teacher_Studio.md's
-- "New schema this experience requires" section: `lesson_plans`,
-- teacher-authored content. Manual authoring only this sprint -- see
-- the approved design proposal: no AI generation, no CurriculumProvider/
-- Learning Commons integration, no scheduling intelligence. `source
-- jsonb` from the doc's proposed schema is deliberately omitted here --
-- it exists specifically for CurriculumProvider/Learning Commons
-- attribution on AI-sourced reference cards, none of which this sprint
-- builds; simple to add back when that sprint actually needs it.
--
-- Two columns beyond the doc's proposed schema, both approved as
-- necessary gaps to fill (the doc names the table but not these):
--   * class_id -- required. A lesson belongs to exactly one of the
--     teacher's own classes; ownership is enforced at the application
--     layer (like every other class-scoped write in this codebase),
--     since RLS alone can't see across tables to confirm a *given*
--     class_id belongs to the caller at insert/update time.
--   * concept_id -- optional, a lightweight FK reference only (no
--     curriculum content is copied into this table). Nullable,
--     `on delete set null` rather than cascading a concept's removal
--     into deleting a teacher's lesson plan.
--
-- `status` (draft/published) is new: not a workflow-approval gate,
-- just lets a teacher distinguish work-in-progress from finished
-- content, and leaves room for a future assignment/distribution feature
-- to key off "published" without a schema change. Defaults to 'draft'.
--
-- RLS shape matches 0019_assessments_authored.sql exactly (a plain
-- per-owner table, teacher_id = auth.uid(), all four CRUD policies
-- including delete -- hard delete, no downstream data to orphan yet,
-- per the approved design).
--
-- updated_at is maintained by a trigger this time, not by each route
-- remembering to set it (0019's own approach) -- set_updated_at() is a
-- small, generic trigger function other per-owner tables can adopt
-- later; only lesson_plans uses it today.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.lesson_plans (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  concept_id text references public.concepts (id) on delete set null,
  title text not null,
  grade smallint,
  subject text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  objectives text not null default '',
  materials text not null default '',
  procedure text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lesson_plans_teacher_id_idx on public.lesson_plans (teacher_id);
create index lesson_plans_class_id_idx on public.lesson_plans (class_id);

create trigger lesson_plans_set_updated_at
  before update on public.lesson_plans
  for each row
  execute function public.set_updated_at();

alter table public.lesson_plans enable row level security;

create policy "Teachers can view their own lesson plans"
  on public.lesson_plans for select
  using (teacher_id = auth.uid());

create policy "Teachers can create their own lesson plans"
  on public.lesson_plans for insert
  with check (teacher_id = auth.uid());

create policy "Teachers can update their own lesson plans"
  on public.lesson_plans for update
  using (teacher_id = auth.uid());

create policy "Teachers can delete their own lesson plans"
  on public.lesson_plans for delete
  using (teacher_id = auth.uid());
