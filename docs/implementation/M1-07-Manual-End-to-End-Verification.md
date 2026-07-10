# M1-07 — Manual End-to-End Verification

**Status:** ⏳ Blocked — pending real session access
**Date:** 2026-07-10

**Note on numbering:** this is the original M1 plan's Task 9, renumbered to M1-07 after the M1-04/M1-05/M1-06 renumbering described in those documents.

---

## Objective

Exercise the fully-wired M1 chat path (auth → rate limit → safety filter → LLM call → save) through the live, authenticated app: a real question, a context-dependent follow-up, an unsafe phrase, and ideally a simulated LLM failure — the one class of verification that can't be done with mocks, because it depends on a real signed-in session and a real Claude response.

---

## Why This Task Is Blocked

Every prior M1 task (M1-02 through M1-06) was verified with a mock Supabase client run directly against the real source files (`node --experimental-strip-types`), which needs no real session. This task is different by design — M0-08 itself needed "a signed-in test student" for its own equivalent live check, per its Testing Performed section.

This repo has no service-role key (`.env.local.example` only lists `SUPABASE_URL` / `SUPABASE_ANON_KEY`) and no seed script or fixture for a test student account. Without one of those, there's no way to obtain a real authenticated session from inside this environment — not a missing implementation, a missing credential.

---

## What's Needed to Unblock

One of:

1. **A test student account's login credentials** (email/password, or a magic-link email I can trigger and you can forward the link from), so I can sign in through the running dev server and drive the checks below myself.
2. **You run the manual pass directly** in the browser (same as M0-10's final pass) against the local dev server, following the checklist below, and report back what happened — I can start the dev server and tell you what to look for.
3. **A Supabase service-role key**, scoped only to this local `.env.local` (never committed — same handling as the Anthropic key in M1-01), which would let a script create a disposable test student directly, without touching production auth.

---

## Verification Checklist (once unblocked)

- [ ] Sign in as a student; send a real, safe math question; confirm a genuine Claude reply (not the fallback) is returned and saved.
- [ ] Send a context-dependent follow-up in the same conversation (e.g., "what about for negative numbers?") and confirm the reply shows the model actually used the prior turn, not just the latest message.
- [ ] Send one unsafe phrase (e.g., a self-harm or prompt-injection example from M1-06's set); confirm the reply is the category decline, not a Claude-generated response, and that the `events` row is `safety_blocked` / `safety_reply_sent` — not `llm_call_succeeded` / `llm_call_failed`. This is the live counterpart to M1-06's static/code-level guarantee.
- [ ] If feasible, simulate an LLM failure (e.g., a temporarily invalid API key) and confirm the student still receives `buildLLMFailureReply()`'s honest message, saved normally, with `llm_call_failed` logged and `isFallbackReply: true` on the terminal `reply_sent` event.
- [ ] Send 11+ messages within 60 seconds and confirm the 11th is rejected with `429` and a `rate_limited` event (live counterpart to M1-05's mock-based test).

---

## Open Issues

- Blocked pending one of the three unblock paths above — raised to the user rather than guessed at or skipped.
- No client-side UX exists yet for a `429` response (carried forward from M1-05) — worth noting during the rate-limit check above, not something to fix as part of this task.

---

## Next Task

M1-08 — Documentation consistency pass (originally plan Task 10; likely already largely satisfied incrementally by M1-01 through M1-07)
