# M1-06 — Safety Filter Regression Test

**Status:** ✅ Completed
**Date:** 2026-07-10

**Note on numbering:** this is the original M1 plan's Task 8 ("Safety filter regression test against the new LLM path"), renumbered to M1-06 after Tasks 4-6 were combined (see [M1-04](M1-04-Chat-Route-Integration.md)) and Task 7 became [M1-05](M1-05-Rate-Limiting.md).

---

## Objective

Confirm that M1-04's LLM wiring didn't weaken M0-08's safety filter: unsafe messages must still be caught with the same accuracy as M0, and must still result in zero Anthropic API calls.

---

## Why This Task Exists

M0-08's filter was built and tested against a route that always returned a free placeholder reply. M1-04 rewired the safe branch of that same route to call a real, paid Claude API. This task exists to confirm that rewiring didn't touch the unsafe branch — a regression here would mean either unsafe content silently reaching Claude, or the filter itself drifting.

---

## Requirements

- Re-run the same category of test phrases M0-08 used (self-harm, violence, sexual content, prompt injection, plus safe controls) against the current filter source.
- Confirm, from the actual `/api/chat` control flow, that the unsafe branch cannot reach `generateTeachingReply()`.

---

## Testing Performed

**1. Filter regression (dynamic, automated).** Ran 24 phrases — 19 unsafe (5 self-harm, 5 violence, 4 sexual-content, 5 prompt-injection) and 5 safe math-question controls — directly against the real `checkMessageSafety()` source (`web/src/lib/safety/filter.ts`), using the same `node --experimental-strip-types` approach as prior standalone tests. All 24 passed: every unsafe phrase was flagged with the expected category, no safe control was false-flagged. `UNSAFE_PATTERNS` is unchanged since M0-08 — this confirms no drift, not just no regression.

**2. Zero-Anthropic-calls guarantee (static, code-level).** `web/src/app/api/chat/route.ts` calls `generateTeachingReply()` exactly once, inside the `else` branch of a single `if (!safetyCheck.safe) { ... } else { ... }` (lines 124-167). The unsafe branch assigns `replyContent` directly from `buildSafetyDeclineMessage()` and never touches `buildConversationContext()` or `generateTeachingReply()` — the same structure M0-08 put in place and M1-04's docs confirmed was "untouched" when the safe branch was rewired. This makes a Claude call for unsafe content a compile-time impossibility in the current code, not just an untested-but-hoped-for property.

**What this task does not cover:** an actual live request through the authenticated route, confirming in the real `events` table that a genuine unsafe message produces `safety_blocked`/`safety_reply_sent` and no `llm_call_succeeded`/`llm_call_failed` row. That requires a real signed-in session (M0-08 itself needed a signed-in test student for its own live confirmation) — this repo has no service-role key or seed script for a test user, so it isn't something this task can script on its own. It's covered by [M1-07](M1-07-Manual-End-to-End-Verification.md)'s manual pass, which folds in an unsafe-phrase check specifically so it isn't dropped.

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| Unsafe phrases across all four categories still correctly detected | ✅ Met (19/19) |
| Safe messages not false-flagged | ✅ Met (5/5) |
| Unsafe branch cannot reach the LLM call | ✅ Met by construction (verified against current `route.ts`, not assumed from M0-08) |
| Live confirmation via a real authenticated request | ⏳ Deferred to M1-07 (requires a real session) |

---

## Lessons Learned

- A regression test for "did the filter itself change" and a regression test for "can unsafe content still reach a paid API" are two different claims — the first is answerable with a pure-function test, the second needed a structural read of the route, not just re-running the same phrases.

---

## Open Issues

- Carried forward from M0-08: no region-specific crisis hotline in the self-harm decline.
- The live, real-session confirmation of zero Anthropic calls for unsafe content is not yet done — see M1-07.

---

## Next Task

[M1-07 — Manual End-to-End Verification](M1-07-Manual-End-to-End-Verification.md)
