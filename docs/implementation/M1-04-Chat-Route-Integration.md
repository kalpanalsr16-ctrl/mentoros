# M1-04 — Chat Route Integration

**Status:** ✅ Completed
**Date:** 2026-07-10

**Note on scope:** the M1 plan listed this as three separate tasks — Task 4 (wire into `/api/chat`), Task 5 (graceful-degradation handling for LLM failures), Task 6 (extend event logging with LLM-specific events/payload). In practice these are one inseparable change to one file: wiring a call that can fail necessarily requires deciding what happens on failure, and observability into that failure is part of the same edit. Splitting them into three commits would have been artificial. This document covers all three; the M1 milestone breakdown is renumbered accordingly from here (see `M1-05` for what was originally Task 7).

---

## Objective

Replace `/api/chat`'s placeholder-reply branch with a real call to `generateTeachingReply()` (M1-03), built from `buildConversationContext()` (M1-02) — the point where M1's individually-tested pieces become one real, working feature.

---

## Why This Task Exists

M1-01 through M1-03 built and independently verified three pieces (credential, history assembly, LLM call) in isolation. This task is where they're wired into the actual request path a student's message travels through, replacing the last piece of M0 that was still a placeholder.

---

## Requirements

- Safe messages get a real, context-aware Claude reply instead of the M0 placeholder.
- Unsafe messages are completely unaffected — still zero Anthropic API calls, per M0-08's design.
- If the Claude call fails, the student still gets an honest, saved reply — never a raw crash or a silently missing turn.
- The new external dependency (the Anthropic API call itself) is independently observable in the `events` table, separate from whether the resulting text made it into the database.

---

## Architecture Decisions

- **`buildConversationContext()` is called after the user's message is already saved**, so the history it returns naturally ends with the message the student just sent — no separate "append the current message" step, exactly as designed in M1-02.
- **Two-tier event logging for the LLM step.** `llm_call_succeeded` / `llm_call_failed` are logged immediately when the Claude call resolves, carrying `model`, `inputTokens`, `outputTokens`, and `latencyMs` on success (or `reason` + `latencyMs` on failure) — separate from the existing `reply_sent` / `reply_failed` events, which are about whether the reply text made it into `messages`. These answer two different questions ("did Claude answer, how long did it take" vs. "did the reply get saved") and conflating them would have made both harder to query.
- **On LLM failure, the fallback reply is still saved as a normal assistant message**, tagged `isFallbackReply: true` in the terminal `reply_sent` event's payload rather than treated as a distinct failure path all the way through. This mirrors the existing M0-06/M0-08 precedent (placeholder replies, safety declines) of every outcome getting a real, persisted, reviewable turn in the conversation — a Claude outage is not a reason to break that invariant.
- **The unsafe branch is untouched** — no history is built, no LLM call is made, for unsafe content. This was already the design going into M1 (see M1-03's docs), confirmed unchanged here rather than re-decided.
- **`LLMReplyResult`'s success variant was extended** (in `client.ts`, from M1-03) to carry `model`/`inputTokens`/`outputTokens` — a small, direct extension of Task 3's own file to support this task's event-logging requirement, rather than inventing a second return channel.

---

## Files Created

None.

## Files Modified

- `web/src/app/api/chat/route.ts` — imports `buildConversationContext` and `generateTeachingReply`; the safe-message branch now builds history, calls Claude, logs the call outcome, and either uses the real reply or an honest fallback; `buildPlaceholderReply()` removed and replaced with `buildLLMFailureReply()`.
- `web/src/lib/llm/client.ts` — `LLMReplyResult`'s success case now includes `model`, `inputTokens`, `outputTokens` (populated from `response.model` / `response.usage`).

---

## Database Changes

None — uses the existing `messages` and `events` tables.

---

## API Changes

- `POST /api/chat` — the safe-message reply is now real (Claude-generated), not the M0 placeholder text. Response shape (`conversationId`, `userMessage`, `assistantMessage`, `traceId`) is unchanged.

---

## UI Changes

None (the existing `ChatShell` already renders whatever `assistantMessage.content` is returned).

---

## Testing Performed

- `npm run build` — clean, zero TypeScript errors, after both the `route.ts` wiring and the `client.ts` type extension.
- Started the local dev server and confirmed the route still loads and responds correctly to an unauthenticated request (`401 {"error":"Not signed in."}`, unchanged from M0-04's behavior) — this exercises the module import graph for the two new imports (`context-agent`, `llm/client`) and confirms nothing breaks at server startup or module load time.
- Checked the dev server log for errors/warnings during startup and the test request — none found. Server process confirmed stopped cleanly afterward.
- **Not yet tested:** a real, authenticated, end-to-end request through the live route (real student, real question, real persisted Claude reply). That requires either the browser (a real session cookie) or the test student's credentials, neither of which this task had access to — it's explicitly covered by the renumbered M1 plan's manual end-to-end verification task, not skipped here.

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| Safe messages get a real Claude reply | ✅ Implemented, verified indirectly (M1-03's isolated tests already prove `generateTeachingReply` works; this task's build + smoke test prove the wiring compiles and loads) — full authenticated path deferred to end-to-end verification |
| Unsafe messages still make zero Anthropic API calls | ✅ Met by construction (branch untouched) |
| LLM failure produces an honest, saved reply, not a crash | ✅ Implemented, not yet exercised against a real simulated failure through the live route (deferred, same as above) |
| LLM call outcome is independently observable in `events` | ✅ Met (`llm_call_succeeded`/`llm_call_failed`, verified by code review against the existing `logEvent` pattern) |
| Clean build | ✅ Met |

---

## Lessons Learned

- Wiring a fallible external call into an existing route naturally forces the failure-handling and observability questions to be answered in the same change — trying to artificially split "wire it in" from "handle it failing" would have meant either shipping code that couldn't compile cleanly or writing a version that gets thrown away in the next task.

---

## Open Issues

- Full authenticated end-to-end verification (real student session, real question, a deliberately simulated LLM failure) is still pending — carried forward as the renumbered next manual-verification task.
- Rate limiting on `/api/chat` remains unimplemented (was M1 plan Task 7) — every message now costs real money via the Claude call, and this is still open.

---

## Next Task

M1-05 — Per-student rate limiting on `/api/chat` (renumbered from the original M1 plan's Task 7)
