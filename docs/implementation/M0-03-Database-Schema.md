# M0-03 — Database Schema

**Status:** ✅ Completed
**Date:** 2026-07-09

---

## Objective

Create the minimum set of tables needed to support a real (if placeholder) tutoring conversation — student profiles, conversations, messages, and an observability event log — with Row Level Security enforced from the start rather than bolted on later.

---

## Why This Task Exists

Per [06_Technical_Architecture.md](../../06_Technical_Architecture.md), Row Level Security is the platform's core security model: every table a student can reach must be scoped to `auth.uid()` at the database layer, not just filtered in application code. This task lays down that schema before any feature (auth, chat) is built against it, since retrofitting RLS onto live tables is riskier than designing it in from row one.

---

## Requirements

- `profiles` table extending `auth.users`, auto-created on signup.
- `conversations` and `messages` tables supporting one chat session with ordered messages.
- `events` table for observability (wired up fully in M0-07, but the table needed to exist first).
- RLS enabled and enforced on every table — a student can only read/write their own rows.
- Schema applied via a committed migration file, not ad hoc dashboard clicks.

---

## Architecture Decisions

- **`profiles.id` is the same UUID as `auth.users.id`** (primary key, foreign key, `on delete cascade`), rather than a separate surrogate key — there is exactly one profile per auth user, so a 1:1 shared-key relationship is simpler than a separate id plus a unique foreign key constraint.
- **A `security definer` trigger function (`handle_new_user`) auto-creates the profile row on signup**, run with a fixed `search_path = public` (the standard safe pattern for a definer function), because the anon role active during sign-up has no direct INSERT policy on `profiles` — the trigger is the only path that can create that row at signup time.
- **`conversations.status`** uses a `check` constraint (`active | completed | abandoned | archived`) rather than a separate lookup table — four fixed values don't justify the extra join.
- **`messages.role`** constrained to `system | user | assistant`, matching the shape every LLM chat API expects, so message rows can be fed directly into a model call in M1 without transformation.
- **`messages` RLS policies scope through a subquery on `conversations.student_id`** rather than duplicating `student_id` onto every message row — a message's ownership is entirely determined by which conversation it belongs to, so this avoids a redundant, could-drift-out-of-sync column.
- **`events` has no SELECT policy at all**, by design — it's an internal, insert-only audit log intended to be read via the Supabase dashboard (which bypasses RLS) or a future admin surface, not by the student-facing app. This was a deliberate, discussed decision, not an oversight.
- **Indexes added up front**: `conversations (student_id, started_at desc)`, `messages (conversation_id, created_at)`, and four separate indexes on `events` (`trace_id`, `conversation_id`, `student_id`, `created_at`) — all four `events` columns are genuine, distinct query patterns (trace lookup, per-conversation audit, per-student audit, time-range audit), not speculative indexing.

### Deferred, discussed explicitly

When this schema was proposed, several additions were considered and deliberately deferred rather than silently skipped, since they'd add real complexity without a concrete near-term need:
- A dedicated `learner_profile` table beyond `profiles` (grade/reading-level/personalization fields) — deferred until the Personalization Agent (M2+) actually needs to read/write it.
- Long-term memory tables for the Memory Agent — deferred until that agent exists; premature schema for unbuilt features risks guessing wrong.
- Multi-tutor / multi-subject scoping beyond `conversations.subject` — `subject` defaults to `'mathematics'` and is already a column, so widening later is a low-cost migration, not a redesign.

---

## Files Created

- `web/supabase/migrations/0001_init.sql` — full schema: `profiles`, `handle_new_user()` trigger function + `on_auth_user_created` trigger, `conversations`, `messages`, `events`, all RLS policies and indexes.

## Files Modified

None.

---

## Database Changes

- Enabled the `pgcrypto` extension (for `gen_random_uuid()`).
- Created tables: `profiles`, `conversations`, `messages`, `events` — see `0001_init.sql` for full DDL.
- Created function `handle_new_user()` and trigger `on_auth_user_created` on `auth.users`.
- Enabled RLS on all four tables with the policies described above.

---

## API Changes

None — no application code reads/writes these tables yet (added in M0-04 through M0-07).

---

## UI Changes

None.

---

## Testing Performed

- Migration applied via the Supabase SQL Editor (see Lessons Learned for why, not the CLI/direct connection).
- Confirmed all four tables, the trigger, and every RLS policy exist via the Supabase dashboard's table editor and policy list.
- Signed up a real test student and confirmed a matching `profiles` row was created automatically by the trigger, with no application code involved.
- Attempted to `select` another (fabricated) student's `profiles` row using the test student's session — correctly returned zero rows, confirming RLS is actually enforced rather than just declared.

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| All four tables exist with the documented columns | ✅ Met |
| RLS enabled on every table | ✅ Met |
| A new signup automatically gets a `profiles` row | ✅ Met |
| A student cannot read another student's row via the client | ✅ Met (verified) |
| Schema captured in a committed migration file | ✅ Met (`0001_init.sql`) |

---

## Lessons Learned

- Direct Postgres connections to Supabase from a local script require a CA certificate only downloadable from that project's own dashboard — there's no generic trusted-CA URL for it. Weakening TLS verification to work around this was correctly refused (both by the operator and by the permission system) as a bad trade for a one-time migration. Pasting the migration SQL directly into Supabase's SQL Editor was the safer and, in the end, faster path.
- Designing RLS policies alongside the schema (rather than after) made the "who can read/write this row" question concrete for every table while the design was still cheap to change.

---

## Open Issues

None.

---

## Next Task

[M0-04 — Authentication](M0-04-Authentication.md)
