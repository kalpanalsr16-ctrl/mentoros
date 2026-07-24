-- Epic G2 (Teacher Studio Dashboard) -- adds a teacher-scoped SELECT
-- policy to `events`, alongside the existing student self-read policy
-- (0006_events_self_read.sql). A teacher can read events for students in
-- their own classes (via class_students, 0011_classes.sql) -- this is
-- the same teacher-scoped access path 03_Teacher_Studio.md names as a
-- shared prerequisite for the Dashboard's "recent activity" feed and, per
-- 10_API_Contracts.md, Misconception Reports/Progress Analytics later.
--
-- Never exposes message/conversation content: `events.payload` has never
-- carried a prompt or chain-of-thought in this codebase (every logEvent
-- call in route.ts logs structured decision data only -- risk levels,
-- scores, intents, latency/token counts), so this policy only ever
-- surfaces structured activity ("Jamie completed an assessment, 2h ago"),
-- never a transcript.

create policy "Teachers can read events for students in their own classes"
  on public.events for select
  using (
    student_id in (
      select class_students.student_id
      from public.class_students
      join public.classes on classes.id = class_students.class_id
      where classes.teacher_id = auth.uid()
    )
  );
