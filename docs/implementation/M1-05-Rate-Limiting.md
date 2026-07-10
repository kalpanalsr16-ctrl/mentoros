# M1-05 — Rate Limiting

**Status:** ✅ Completed
**Date:** 2026-07-10

**Note on numbering:** this is the original M1 plan's Task 7 ("Basic per-student rate limit on `/api/chat`"), renumbered to M1-05 after Tasks 4-6 were combined into a single document (see [M1-04](M1-04-Chat-Route-Integration.md)).

---

## Objective

Add a basic per-student rate limit to `/api/chat` — the first milestone where every message costs a real Claude API call (M1-04), and there was previously no guard against a runaway client loop or scripted abuse running up cost.

---

## Why This Task Exists

M0 never needed this: the placeholder reply was free. M1-04 made every message a paid Anthropic API call, which changes the risk calculus — flagged explicitly as an open risk in M1-04's docs and in the original M1 plan's security considerations.

---

## Requirements

- Cap how many messages a student can send in a short window.
- Generous enough not to interfere with normal interactive use.
- Fails safe in a way that doesn't break the chat feature over a transient issue.
- No new infrastructure (Redis, external rate-limit service) — use what's already there.

---

## Architecture Decisions

- **Counts against the `messages` table, not `events`.** `events` deliberately has no SELECT RLS policy (M0-03) — it's an insert-only audit log, not meant to be queried by the student-scoped client that `/api/chat` uses. Adding a SELECT policy to `events` just for this would have been a real, deliberate security-posture change to a table whose design was already explicitly discussed and settled. `messages` already has a SELECT policy scoped to the student's own conversations, so counting `role = 'user'` rows in a recent window reuses existing, already-correct RLS scoping with zero schema changes.
- **10 messages per 60-second rolling window.** Chosen to be generous for a real student typing and sending messages interactively, while catching a scripted loop within seconds rather than minutes. Not derived from real usage data (none exists yet) — an explicit placeholder judgment call, easy to tune once real traffic exists.
- **Checked first, before any other work in the route** — before the safety check, before conversation lookup, before any insert. A student over the limit shouldn't cost a database round trip beyond the rate-limit check itself.
- **Fails open on a query error.** This is a cost guard, not a safety boundary (unlike M0-08's content filter, which must never fail open) — a transient DB issue shouldn't block a legitimate student's message. Same trade-off `logEvent()` already makes for observability: availability wins for a non-critical-path check.
- **In-memory rate limiting was explicitly rejected.** Vercel's serverless functions don't reliably share memory across invocations — a per-instance counter would under-count (or miscount entirely) across cold starts and multiple concurrent instances. A DB-backed check is correct regardless of which instance handles a given request, at the cost of one extra query per message.

---

## Files Created

- `web/src/lib/security/rate-limit.ts` — `checkRateLimit(supabase)`.

## Files Modified

- `web/src/app/api/chat/route.ts` — calls `checkRateLimit()` immediately after the auth check; returns `429` with a `rate_limited` event logged if over the limit.

---

## Database Changes

None — reuses the existing `messages` table and its existing RLS policy.

---

## API Changes

- `POST /api/chat` — can now return `429` with `{ error, traceId }` if the student has sent 10+ messages in the last 60 seconds.

---

## UI Changes

None (no client-side handling of a 429 response yet — a real UX treatment, e.g. a visible "slow down" message, is a reasonable follow-up but out of scope for this basic guard).

---

## Testing Performed

Unit-tested with a mock Supabase client (same `node --experimental-strip-types` approach as M1-02/M0's other standalone tests, run directly against the real source file):

- Under the limit (count 2, 9): not limited.
- At the limit exactly (count 10): limited, correct count reported.
- Over the limit (count 25): limited.
- Simulated query error: fails open, not limited.
- Confirmed the query actually filters on `role = "user"` and a `created_at` window, not just table name — verified by inspecting the mock's recorded call sequence, not just the final result.

Also re-ran the same dev-server smoke test used in M1-04 (unauthenticated request against the live route) after this change — still returns the correct `401`, confirming the new import doesn't break server startup or the module graph.

`npm run build` — clean, zero TypeScript errors.

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| Caps messages per student in a rolling window | ✅ Met (10/60s, verified against mock) |
| Doesn't require new infrastructure | ✅ Met (reuses `messages` + existing RLS) |
| Fails safe on a check failure | ✅ Met (fails open, by design, documented as deliberate) |
| Checked before other route work | ✅ Met (first check after auth) |
| Zero TypeScript errors on build | ✅ Met |

---

## Lessons Learned

- Serverless deployment (Vercel) rules out naive in-memory state for anything that needs to be correct across requests — this was worth deciding explicitly rather than defaulting to the simplest-looking implementation and discovering it doesn't actually work once deployed.
- Reusing an existing RLS-scoped table's read access is often simpler than granting new read access to a table that was deliberately designed without it — worth checking "is there already a table that answers this question" before adding a new policy.

---

## Open Issues

- The 10/60s threshold is a placeholder judgment call, not derived from real usage data — worth revisiting once real traffic exists.
- No client-side UX for a `429` response yet.
- Rate limiting is per-student only; there's no organization-wide or global cost cap yet.

---

## Next Task

[M1-06 — Safety Filter Regression Test](M1-06-Safety-Regression.md)
