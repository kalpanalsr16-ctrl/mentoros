-- Rollback for 0006_events_self_read.sql.

drop policy if exists "Students can read their own events" on public.events;
