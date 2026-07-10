# M0-07 — Event Logging

**Status:** ✅ Completed
**Date:** 2026-07-09

---

## Objective

Give every request through `/api/chat` a trace ID that groups all the events it produces, and log those events to the `events` table — the platform's first real piece of observability, ahead of any actual AI logic to observe.

---

## Why This Task Exists

Per [14_Event_Driven_Architecture.md](../../14_Event_Driven_Architecture.md), MentorOS agents communicate and are audited via events, not direct calls. This task establishes that pattern at the infrastructure level — trace ID generation, an insert-only audit log, a logging helper that never breaks the feature it's observing — before any real agent exists to generate events from. M1's agents will plug into this same mechanism rather than needing their own.

---

## Requirements

- Every `/api/chat` request gets a unique trace ID, returned in the response.
- Every meaningful step of that request (message received, safety check, reply sent, or a rejection) is logged as an event tied to that trace ID.
- A logging failure must never break the chat request it's attached to.

---

## Architecture Decisions

- **`generateTraceId()` uses `crypto.randomUUID()`** — no external dependency needed, and UUIDs are already the primary key type used throughout the schema.
- **`logEvent()` never throws.** It catches and `console.error`s any insert failure internally rather than propagating it, mirroring the same principle stated for the Evaluation Agent in [13_Evaluation_Agent.md](../../05_Agent_Architecture/13_Evaluation_Agent.md) ("Evaluation should never block learner interactions") — observability code failing must never take down the feature it's watching.
- **Event names are specific and outcome-based** (`message_received`, `safety_blocked`, `reply_sent`, `safety_reply_sent`, `message_rejected`, `reply_failed`) rather than one generic `chat_event` with a status field — this makes the `events` table directly queryable/filterable by outcome without unpacking `payload` first.
- **One shared code path in `/api/chat` logs events for both the safe and unsafe cases** (see M0-08) rather than duplicating the save/log logic per branch — avoids the two paths drifting out of sync.

---

## Files Created

- `web/src/lib/observability/trace.ts` — `generateTraceId()`, `logEvent(supabase, params)`.

## Files Modified

- `web/src/app/api/chat/route.ts` — every branch (success and failure) now calls `logEvent()` with the request's trace ID; the trace ID is included in the JSON response.

---

## Database Changes

None — uses the `events` table created in M0-03.

---

## API Changes

- `POST /api/chat` response now includes `traceId` on every response, success or error.

---

## UI Changes

None.

---

## Testing Performed

- Sent a normal message via the UI, then queried the `events` table (via the Supabase dashboard, which bypasses RLS) filtered by the returned `traceId`, and confirmed both a `message_received` and a `reply_sent` row existed for that single request.
- Deliberately triggered a rejected write (message insert against a conversation the test student didn't own, via the same standalone script used in M0-06) and confirmed a `message_rejected` event was still logged despite the underlying save failing — proving the logging path is independent of the save path succeeding.
- Confirmed via code review (not just testing) that `logEvent()`'s Supabase call is wrapped so a thrown/returned error is caught and logged to `console.error`, not re-thrown into the request handler.

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| Every `/api/chat` request produces a trace ID | ✅ Met |
| Events are logged and queryable by that trace ID | ✅ Met |
| A logging failure cannot break the chat request | ✅ Met (verified by design + code review) |

---

## Lessons Learned

- Because `events` deliberately has no SELECT RLS policy (M0-03), verifying event rows during testing requires the Supabase dashboard or a service-role script — a normal student-scoped client can't read them back, which is correct but worth remembering when debugging.

---

## Open Issues

None.

---

## Next Task

[M0-08 — Safety Filter](M0-08-Safety-Filter.md)
