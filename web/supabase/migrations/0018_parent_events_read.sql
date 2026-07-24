-- Epic H3 (Parent Dashboard) Sprint 3 -- the Recommendations section
-- reads `assessment_completed` events (Assessment Agent's
-- recommendedNextStep field), which 0017_parent_verified_read.sql
-- didn't cover. Same teacher-scoped access pattern as
-- 0012_events_teacher_read.sql, swapped to parent_links gated on
-- status = 'verified', identical to every other 0017 policy.
--
-- Never exposes message/conversation content: `events.payload` has
-- never carried a prompt or chain-of-thought in this codebase (see
-- 0012's own comment) -- only structured assessment output
-- (masteryScore, status, recommendedNextStep, short feedback text),
-- the same fields teachers already read via 0012. This does not grant
-- read access to `messages`/`conversations` -- those stay self-read
-- only; a parent still never sees a transcript.

create policy "Parents can read events for their verified linked children"
  on public.events for select
  using (
    student_id in (
      select parent_links.student_id
      from public.parent_links
      where parent_links.parent_id = auth.uid()
        and parent_links.status = 'verified'
    )
  );
