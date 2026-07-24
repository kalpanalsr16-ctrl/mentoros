-- Epic F7 (Achievements) -- docs/ui-architecture/02_Student_Experience.md's
-- Achievements section: "a persisted historical record, deliberately not
-- purely derived at read time (once earned, an achievement shouldn't
-- disappear if underlying mastery later dips)." The award RULE itself
-- ("student completed an assessment above 80% -> award badge X") is
-- explicitly out of scope for that document -- application logic, not an
-- agent, and not designed there. This migration only adds the table the
-- future award job will write to; this sprint's screen only reads it.
--
-- Streak count is NOT stored here -- it's derived at read time from
-- messages.created_at (computeStreak(), lib/dashboard/dashboard-aggregation.ts),
-- already built for the Dashboard and reused as-is for Achievements'
-- "current streak" element, per the doc's own note that no new table is
-- needed for that part.

create table public.achievements_earned (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  achievement_type text not null,
  earned_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index achievements_earned_student_id_idx on public.achievements_earned (student_id);

alter table public.achievements_earned enable row level security;

create policy "Students can read their own achievements"
  on public.achievements_earned for select
  using (student_id = auth.uid());

-- Deliberately no insert/update/delete policy for authenticated users:
-- the award mechanism doesn't exist yet (see comment above), so nothing
-- in this sprint's application code ever writes here. When that future
-- job is designed, it decides its own trust model then -- this sprint
-- doesn't pre-guess it.
