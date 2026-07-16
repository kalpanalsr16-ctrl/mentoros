-- Adds a narrow self-read SELECT policy to `events`, per
-- docs/ui-architecture/13_Implementation_Sequence.md Epic E1. Until now
-- `events` (0001_init.sql) had RLS enabled with an INSERT policy only --
-- "readable via the Supabase dashboard, not the app's client-facing API"
-- was a deliberate M0 decision, correct for a system with no reason yet
-- to show a student their own trace data.
--
-- The AI Transparency Panel (Sprint 3) is that reason. This policy is
-- scoped identically to every other student-owned-row policy in this
-- schema (`student_id = auth.uid()`) -- a student can read their own
-- events and no one else's. No INSERT/UPDATE/DELETE policy is added or
-- changed; `logEvent()`'s existing insert path is untouched.

create policy "Students can read their own events"
  on public.events for select
  using (student_id = auth.uid());
