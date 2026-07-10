# M1-02 — Context Agent

**Status:** ✅ Completed
**Date:** 2026-07-10

---

## Objective

Build the first real agent in [05_Agent_Architecture/](../../05_Agent_Architecture/): a function that assembles a conversation's recent message history into the shape Anthropic's Messages API requires, ready to be handed to a real LLM call in M1-03. History assembly only — no LLM call, no wiring into `/api/chat` yet (that's M1-04).

---

## Why This Task Exists

Per [08_Roadmap.md](../../08_Roadmap.md), Context Agent is the only agent in the catalog with zero agent-level dependencies, which is why it's first. Its full spec (`02_Context_Agent.md`) describes a structured Context Object with topic tracking, reference resolution, and conversation summarization — M1's version deliberately implements only the piece needed to unblock a real reply: a correctly-ordered, correctly-capped, API-valid message history. The rest of the spec is explicitly deferred (see Open Issues).

---

## Requirements

- Given a conversation ID, return its messages in chronological order, shaped as `{ role: "user" | "assistant", content: string }[]`.
- Exclude any `system`-role rows (Claude's system prompt is a separate top-level field, not part of the message list).
- Bound the history to a fixed size, since summarization is deferred.
- The returned list must always be valid for the Anthropic API: it must start on a `user` turn.
- Independently testable without needing the full Next.js request context or real database credentials.

---

## Architecture Decisions

- **A fixed 20-message recency window (`MAX_HISTORY_MESSAGES`), not summarization.** The full Context Agent spec calls for a generated conversation summary to bound token usage; building that would mean a second LLM call before the first real teaching reply even exists. A recency cap achieves the same token/latency bound with zero added complexity, and is honestly documented as a temporary stand-in, not the final design.
- **Leading-assistant trim after capping.** Capping to "the most recent N messages" can land the window boundary between a user/assistant pair, leaving a list that opens with `assistant` — which the Anthropic API rejects outright. The function drops leading assistant rows until the list starts on `user`. This was not caught by an initial naive test — see Testing Performed.
- **Takes a `supabase` client as a parameter rather than constructing one itself**, matching the existing `logEvent()` convention in `trace.ts` — keeps the function usable both from a real request (the Next.js server client) and from a standalone test (a mock or plain `supabase-js` client), since it depends only on the client's structural shape, not on Next.js's request-scoped `next/headers` machinery.
- **Fails safe, not loud.** A Supabase query error returns an empty array rather than throwing, consistent with `logEvent()`'s "never break the feature it's watching" principle — a context-assembly failure should degrade to "no history" rather than crash the whole reply.

---

## Files Created

- `web/src/lib/agents/context-agent.ts` — `buildConversationContext(supabase, conversationId)`.

## Files Modified

None.

---

## Database Changes

None — reads the existing `messages` table.

---

## API Changes

None.

---

## UI Changes

None.

---

## Testing Performed

Unit-tested with a mock Supabase client (Node's native TypeScript stripping, `node --experimental-strip-types`, run directly against the real source file — not a reimplementation):

- Short conversation (6 messages, under the cap): all messages returned, correct chronological order, correct start/end messages.
- Long conversation (25 messages, over the 20-message cap), constructed so the naive cap boundary lands on an assistant message: confirmed the result is capped to ≤20 and, critically, correctly trims down to start on a `user` message.
- Empty conversation: returns `[]`.
- Simulated Supabase query error: returns `[]` rather than throwing.

One real bug was caught and fixed during this process — in the mock, not the source file: an early version of the test's `.limit()` mock was a no-op, silently returning all 25 rows instead of the capped 20, which produced a false failure that looked like a source bug. Fixing the mock to actually truncate (matching real Postgrest behavior) confirmed the actual `context-agent.ts` capping/trim logic was correct all along — worth recording, since it's the kind of test-vs-source ambiguity that's easy to misdiagnose.

`npm run build` — clean, zero TypeScript errors.

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| Returns chronological, role-typed message history for a conversation | ✅ Met |
| Excludes `system`-role rows | ✅ Met (query filters to `user`/`assistant` only) |
| History is bounded | ✅ Met (20-message recency window) |
| Returned list always valid for the Anthropic API (starts on `user`) | ✅ Met (verified against a boundary-landing edge case) |
| Independently testable without real DB credentials | ✅ Met (mock-based unit test) |
| Zero TypeScript errors on build | ✅ Met |

---

## Lessons Learned

- A capped-recency-window approach to bounding context has a real edge case (the cap boundary landing mid-pair) that isn't obvious until you deliberately construct a test case for it — worth testing that scenario explicitly rather than only testing the happy path.
- Mocking a chainable query builder (`.from().select().eq()...`) requires the mock to actually implement each method's real effect (especially `.limit()`), or the test can pass for the wrong reason.

---

## Open Issues

- This function implements only history-window assembly, not the full Context Agent spec: no topic tracking, no explicit reference resolution beyond what the model infers naturally from raw history, no persisted Context Object, no `ContextUpdated`/`ConversationSummarized` events. These remain deferred until a milestone that actually needs them (per `08_Roadmap.md`, summarization becomes necessary once conversations are regularly long enough to need it — not yet the case).
- Not yet integration-tested against the real Supabase database with a real signed-in student's conversation — that's covered by M1-04's wiring task and M1-09's end-to-end pass, per the M1 plan.

---

## Next Task

M1-03 — Claude API Wrapper
