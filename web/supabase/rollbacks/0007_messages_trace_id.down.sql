-- Rollback for 0007_messages_trace_id.sql.

alter table public.messages drop column if exists trace_id;
