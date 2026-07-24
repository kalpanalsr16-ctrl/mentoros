-- Rollback for 0013_profiles_teacher_read.sql.

drop policy if exists "Teachers can view profiles of students in their own classes" on public.profiles;
