# M1-07 — Manual End-to-End Verification

**Status:** ✅ Completed (4 of 5 checklist items; LLM-failure simulation not performed — see Open Issues)
**Date:** 2026-07-10

**Note on numbering:** this is the original M1 plan's Task 9, renumbered to M1-07 after the M1-04/M1-05/M1-06 renumbering described in those documents.

---

## Objective

Exercise the fully-wired M1 chat path (auth → rate limit → safety filter → LLM call → save) through the live, authenticated app: a real question, a context-dependent follow-up, an unsafe phrase, and a rate-limit burst.

---

## What Was Tried First (Scripted, Abandoned)

Before falling back to a manual pass, a scripted self-serve approach was attempted to avoid needing real credentials: sign up a disposable test student directly against the live Supabase project (no service-role key), using `@supabase/ssr`'s documented cookie-adapter interface to capture a real session and drive `/api/chat` with plain `fetch()`. This surfaced two real, previously undocumented facts about the live project, both worth recording since they contradicted existing assumptions:

1. **Email confirmation is ON**, not off. `web/src/app/sign-up/page.tsx` had a comment claiming confirmation was off for this project (true at some earlier point, or never actually verified) — `signUp()` was tested directly against the live project and consistently returned no session, confirming confirmation is required. The comment has been corrected (see Files Modified).
2. **Supabase's built-in email sender is rate-limited**, and a handful of signup attempts during this investigation exhausted it — every subsequent signup attempt failed with `email rate limit exceeded` before an account could even be confirmed manually.

Both facts made the scripted path impractical for this session (no working test account could be produced), so verification was handed to the user to run manually against the local dev server instead, using their own real account.

---

## Testing Performed

The user ran the following directly in the browser against the local dev server (`localhost:3000`), signed in with a real account:

- [x] **Safe question** — asked a real math question; confirmed a genuine Claude reply.
- [x] **Context-dependent follow-up** — asked a follow-up in the same conversation; confirmed the reply used the prior turn's context.
- [x] **Unsafe phrase** — sent a phrase from M1-06's set; confirmed the category decline was returned, not a Claude-generated reply.
- [x] **Rate-limit burst** — sent 11+ messages within 60 seconds; confirmed the burst was correctly rejected with `429`.
- [ ] **Simulated LLM failure** — not performed. This item required a coordinated step (temporarily pointing the dev server at an invalid Anthropic key for exactly one request) that was never scheduled with the user; explicitly skipped, not silently dropped.

User confirmation: "I have confirmed all the use-cases. It is working absolutely fine" (covering the first four items; the fifth was separately confirmed as not attempted).

---

## Files Modified

- `web/src/app/sign-up/page.tsx` — corrected the stale "email confirmation is off" comment discovered during this task's investigation; the code's behavior was already correct for both cases (it branches on `data.session` either way), only the comment was wrong.

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| Safe messages get a real, context-aware Claude reply | ✅ Confirmed live |
| Unsafe messages still get the filter decline, not a Claude reply | ✅ Confirmed live |
| Rate limiting rejects a real burst | ✅ Confirmed live |
| LLM failure produces the honest fallback reply, live | ⏳ Not performed (see Open Issues) |

---

## Lessons Learned

- A code comment asserting a fact about external project configuration (Supabase's email confirmation setting) is a claim that can go stale the moment someone changes a dashboard setting — it should either be removed or phrased as "as of [date], per [where to check]" rather than stated as an unqualified fact, since nothing in the codebase enforces it stays true.
- Scripted, credential-free verification against a live hosted backend is worth attempting before asking the user for real credentials, but has its own real failure modes (email rate limits, confirmation settings) that aren't visible until tried — worth timeboxing rather than treated as guaranteed to work.

---

## Open Issues

- The LLM-failure simulation (temporarily invalid Anthropic key → confirm `buildLLMFailureReply()` is returned and saved) is still unverified live — the code path was covered by M1-04's build/smoke testing and M1-06's static analysis, but never exercised end-to-end against a real request. Low risk (the code is simple and the failure branch is exercised by construction), but worth doing whenever convenient.
- No client-side UX exists yet for a `429` response (carried forward from M1-05).

---

## Next Task

[M1-08 — Documentation Consistency Pass](M1-08-Documentation-Consistency.md)
