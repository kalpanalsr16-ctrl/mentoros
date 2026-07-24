-- Epic F6 (Revision Planner) -- docs/ui-architecture/02_Student_Experience.md's
-- Revision Planner section: "genuinely new scheduling logic, flagged in
-- 15_Phase2_Roadmap.md as needing its own scoping; this document
-- specifies the screen and data shape only, not the scheduling algorithm
-- itself." This migration adds only the proposed table shape (student_id,
-- concept_id, due_at, frequency, created_at); this sprint's screen only
-- reads it. `frequency` is left as free, nullable text -- no scheduling
-- algorithm exists yet to define what values it should take.

create table public.revision_schedule (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  concept_id text not null references public.concepts (id) on delete cascade,
  due_at timestamptz not null,
  frequency text,
  created_at timestamptz not null default now()
);

create index revision_schedule_student_id_idx on public.revision_schedule (student_id);
create index revision_schedule_due_at_idx on public.revision_schedule (due_at);

alter table public.revision_schedule enable row level security;

create policy "Students can read their own revision schedule"
  on public.revision_schedule for select
  using (student_id = auth.uid());

-- Deliberately no insert/update/delete policy for authenticated users:
-- the scheduling job that decides when a concept becomes due doesn't
-- exist yet (see comment above), so nothing in this sprint's application
-- code ever writes here. That future job decides its own trust model
-- when it's designed -- this sprint doesn't pre-guess it.
