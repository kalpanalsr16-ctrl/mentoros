-- Adds a nullable trace_id to `messages`, per Sprint 3's AI Transparency
-- Panel work (docs/ui-architecture/13_Implementation_Sequence.md Epic E,
-- gap found during that sprint's Technical Design -- not in the
-- original E1-E6 task list).
--
-- Without this, "View reasoning" only works for turns received live in
-- the current browser session (/api/chat's response already returns
-- traceId) -- a page reload loses the association entirely, since
-- trace_id otherwise only lives on `events` rows, which aren't joined
-- back to `messages` anywhere. Nullable and not backfilled: every
-- pre-Sprint-3 row simply has no trace to view, which is the honest
-- state of the data, not an error to paper over.

alter table public.messages
  add column trace_id uuid;

comment on column public.messages.trace_id is
  'Set on assistant messages only (the turn''s trace_id from lib/observability/trace.ts), so the AI Transparency Panel can look up an event trace after a page reload. Null on user messages and on any row inserted before Sprint 3.';
