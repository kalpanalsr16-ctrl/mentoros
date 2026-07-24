-- Sprint 4 (Retry/Regenerate): a nullable timestamp marking an assistant
-- message as no longer the active reply for its turn, per the explicit
-- append-only decision -- retry never overwrites `content` or deletes a
-- row. This preserves trace integrity (the superseded message's trace_id
-- and events rows stay exactly as logged), Evaluation Agent reproducibility
-- (the evaluation that ran against the superseded response is still valid
-- for THAT response), and gives the UI a simple filter (`superseded_at is
-- null`) to hide old attempts without destroying them.
--
-- Retry's flow: mark the current latest assistant message superseded,
-- then insert a brand new assistant message (new id, new trace_id) for
-- the regenerated reply -- never an UPDATE to the superseded row's
-- content. The UPDATE policy below only needs to exist so the app can set
-- this one bookkeeping column; RLS itself doesn't restrict which columns
-- an allowed UPDATE touches (Postgres RLS scopes rows, not columns) --
-- route.ts is the trusted boundary that only ever sets superseded_at,
-- same trust model already used for every other write path in this app.

alter table public.messages
  add column superseded_at timestamptz;

comment on column public.messages.superseded_at is
  'Set when a Retry produces a new assistant reply for the same turn -- this row stays in the table (audit/trace integrity) but is hidden from the default conversation view. Null on user messages and on every currently-active assistant reply.';

create policy "Students can mark their own messages superseded"
  on public.messages for update
  using (
    conversation_id in (
      select id from public.conversations where student_id = auth.uid()
    )
  );
