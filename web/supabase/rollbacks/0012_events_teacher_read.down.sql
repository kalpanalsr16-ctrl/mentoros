-- Rollback for 0012_events_teacher_read.sql.

drop policy if exists "Teachers can read events for students in their own classes" on public.events;
