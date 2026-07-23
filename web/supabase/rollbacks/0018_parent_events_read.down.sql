-- Rollback for 0018_parent_events_read.sql.

drop policy if exists "Parents can read events for their verified linked children" on public.events;
