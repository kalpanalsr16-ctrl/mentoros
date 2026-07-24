# ADR-004: Assistant-role message inserts go through a `SECURITY DEFINER` RPC

**Status:** Accepted
**Source:** migration `0021_messages_role_rls.sql` (student chat), migration `0022_teacher_conversations.sql` (teacher assistant)

## Context

`messages`' original INSERT policy checked only conversation ownership, not `role` — an authenticated student's own session could insert a row with `role: 'assistant'`, forging an AI reply in their own history. The literal fix that comes to mind — `role != 'assistant' OR auth.role() = 'service_role'` — assumes assistant-message inserts run under a service-role client. They don't: the assistant's reply is saved using the same student-session client that saved the user's message, because this codebase has one request-scoped Supabase client per turn, not a separate privileged one.

## Decision

The table's own INSERT policy is restricted to `role = 'user'` only — no assistant carve-out. A `SECURITY DEFINER` Postgres function (`insert_assistant_message` / `insert_teacher_assistant_message`) is the one legitimate path for an assistant row: it re-checks conversation ownership itself (since it runs with elevated privilege, bypassing the caller's own RLS), then performs the insert.

## Consequences

- No client in this codebase ever holds a service-role credential capable of bypassing RLS wholesale — the elevated privilege is scoped to exactly one narrow operation (insert one assistant message into a conversation the caller already owns), not a general escape hatch.
- This is now a repeatable pattern, not a one-off fix: applied first to the student `messages` table (found live, fixed reactively), then applied proactively from the start when the AI Lesson Assistant's `teacher_messages` table was designed — the second time, it shipped correct on day one instead of needing its own discovery-and-patch cycle.
- The literal RLS check (`role != 'assistant' OR auth.role() = 'service_role'`) that a surface reading of "add role validation" suggests is the wrong fix for this architecture — worth stating explicitly so a future change doesn't reintroduce it.
