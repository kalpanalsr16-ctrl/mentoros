-- Rollback for 0008_messages_superseded_at.sql.

drop policy if exists "Students can mark their own messages superseded" on public.messages;
alter table public.messages drop column if exists superseded_at;
