-- Rollback for 0014_learner_concept_mastery_teacher_read.sql.

drop policy if exists "Teachers can read concept mastery for students in their own classes" on public.learner_concept_mastery;
