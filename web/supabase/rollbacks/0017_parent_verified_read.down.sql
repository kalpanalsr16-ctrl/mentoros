-- Rollback for 0017_parent_verified_read.sql.

drop policy if exists "Parents can view profiles of their verified linked children" on public.profiles;
drop policy if exists "Parents can read concept mastery for their verified linked children" on public.learner_concept_mastery;
drop policy if exists "Parents can read achievements for their verified linked children" on public.achievements_earned;
drop policy if exists "Parents can read revision schedules for their verified linked children" on public.revision_schedule;
