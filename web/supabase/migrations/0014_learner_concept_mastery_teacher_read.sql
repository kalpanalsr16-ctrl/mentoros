-- Epic G3/G4 (Teacher Studio: Classes + Class Overview, Student Overview)
-- -- adds a teacher-scoped SELECT policy to `learner_concept_mastery`,
-- alongside the existing student self-read policy (0004_learner_profile.sql).
-- Same teacher-scoped access path as 0012_events_teacher_read.sql and
-- 0013_profiles_teacher_read.sql: a teacher can read mastery rows for
-- students in their own classes (via class_students, 0011_classes.sql).
-- This is what Class Overview's roster/struggling-concepts view and
-- Student Overview's mastery grid both read.
--
-- Never exposes message/conversation content: this table is mastery
-- scores, attempt counts, and short `common_mistakes` strings -- no
-- prompts, no chain-of-thought, no transcript.
--
-- Does NOT add any student-writable policy anywhere -- enrollment stays
-- teacher-managed only, per the explicit product decision for this
-- sprint (self-enrollment/join-code flow is out of scope; see
-- docs/ui-architecture/00_Overview.md's Open Flags and the note left in
-- get-teacher-classes.ts).

create policy "Teachers can read concept mastery for students in their own classes"
  on public.learner_concept_mastery for select
  using (
    student_id in (
      select class_students.student_id
      from public.class_students
      join public.classes on classes.id = class_students.class_id
      where classes.teacher_id = auth.uid()
    )
  );
