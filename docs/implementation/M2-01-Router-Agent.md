# M2-01 — Router Agent

**Status:** ✅ Completed
**Date:** 2026-07-10

**Note on scope:** this single document covers the entire Router Agent milestone — intent classification, the shared `IntentObject` contract, and wiring into `/api/chat` — rather than splitting per file, since the design was fully agreed with the product owner before any code was written (see the architecture-refinement discussion this doc's Architecture Decisions section summarizes) and the pieces don't function independently of each other.

---

## Objective

Add the Router Agent (05_Agent_Architecture/04_Router_Agent.md): classify learner intent from each message using an LLM call, ask a clarifying question when confidence is low, and log routing metadata for observability — without making the Router Agent responsible for generating any teaching content, so M6's real Concept Agent can later replace M1's reply generation without touching this milestone's code.

---

## Why This Task Exists

M1 replaced the placeholder reply with a real Claude call but had no understanding of *what kind* of request a message represents. Per `08_Roadmap.md`, M2 is Router Agent — the only agent besides Context Agent with zero unbuilt dependencies, and the entry point every later agent (Planning, Practice, Assessment, Personalization) will eventually route through.

---

## Requirements

- Classify each safe message into one of the Router spec's six top-level categories (Learning, Practice, Assessment, Revision, Session, Platform), with an optional secondary category for multi-intent messages.
- Ask a clarifying question instead of guessing when confidence is low.
- Log complete routing metadata for observability and future analytics.
- Never let routing become responsible for teaching content — M1's existing reply path must be reusable unchanged by M6.
- No new database schema, no Knowledge Retrieval/Personalization/Memory/Planning/Evaluation code — those remain out of scope per the roadmap.

---

## Architecture Decisions

These were agreed with the product owner *before* implementation, in response to an initial one-combined-Claude-call proposal that was explicitly rejected in favor of a cleaner separation:

- **Router Agent performs intent analysis only — it never generates a reply.** `classifyIntent()` returns an `IntentObject`; the caller (`/api/chat`) decides what to do with it. When `needsClarification` is `false`, the caller falls through to the *unchanged* M1 `generateTeachingReply()` call. When M6's real Concept Agent arrives, only that one call site changes — `router-agent.ts` and `intent-object.ts` do not.
- **Two sequential Claude calls per answerable message (classify, then reply), not one combined call.** This is a deliberate cost/latency trade-off in exchange for the clean separation above — explicitly discussed and accepted, not an oversight. See Open Issues.
- **`IntentObject` is a standalone, dependency-free contract** (`lib/agents/intent-object.ts`, no Claude/Supabase imports) so any future agent (Memory, Adaptive Strategy, Knowledge Retrieval, Evaluation, Analytics, Planning) can depend on the type without pulling in routing internals. It deliberately excludes execution metadata (`model`, latency) — those are the caller's observability concern, not something downstream agents need.
- **`primaryIntent`/`secondaryIntent` use the spec's six top-level categories, not its finer sub-intents** (e.g. not `ConceptExplanation` vs `Definition`). A deliberate M2 simplification since nothing downstream reads sub-intent granularity yet; additive later without breaking the contract.
- **`ROUTING_CONFIDENCE_THRESHOLD` is a named, exported constant (`0.8`)**, not inlined, so it can be tuned once real usage data exists without touching routing logic.
- **`classify` is an injected function parameter, not an internal import.** `classifyIntent(history, classify)` takes the Claude-calling function as an argument (production passes `classifyIntentWithClaude` from `lib/llm/client`) rather than importing it directly. This keeps `router-agent.ts` free of any runtime Anthropic SDK dependency, mirroring the same seam `checkRateLimit()` uses for its Supabase client, and made the confidence-threshold logic unit-testable with a plain mock instead of a live API call.
- **Structured output via `client.messages.parse()` + `zodOutputFormat()`** (per the `claude-api` skill's TypeScript reference), not manual JSON parsing or a tool-use round trip — the SDK validates the response against a Zod schema directly. Required adding `zod` as a new dependency (peer-required by `@anthropic-ai/sdk`'s helper).
- **No extended thinking on the classification call.** Unlike `generateTeachingReply`, this is a bounded 6-category classification, not open-ended reasoning, and the docs don't show thinking composed with structured-output parsing — added latency wasn't worth it for this call.
- **Router failure fails open into M1's existing behavior** — if `classifyIntentWithClaude` errors, `/api/chat` logs `routing_failed` and calls `generateTeachingReply()` directly, exactly as it did before this milestone existed. Routing is additive, not a new hard dependency the chat path can be taken down by.
- **Two known gaps were surfaced, not silently resolved, before implementation:** no Curriculum/Topic taxonomy document exists (topic/subtopic stay free text), and the Router spec's <150ms latency target is incompatible with an LLM-based classifier that also reasons contextually (both accepted as open, not solved, by explicit agreement).

---

## Files Created

- `web/src/lib/agents/intent-object.ts` — `IntentObject`, `PrimaryIntentCategory`.
- `web/src/lib/agents/router-agent.ts` — `ROUTING_CONFIDENCE_THRESHOLD`, `classifyIntent(history, classify)`.

## Files Modified

- `web/src/lib/llm/client.ts` — added `classifyIntentWithClaude(history)`, `RouterClassification`/`RouterClassificationResult` types, and the Router's system prompt (grounded in the spec's Purpose/Supported Intents/Prompt Strategy sections).
- `web/src/app/api/chat/route.ts` — inserted the routing step between `buildConversationContext()` and the reply step; branches on `needsClarification`; logs `intent_detected`/`routing_failed`; extends the terminal `reply_sent` payload with `isClarification` (mirroring M1-04's `isFallbackReply` precedent).
- `web/package.json` / `package-lock.json` — added `zod@^4.4.3`.

---

## Database Changes

None. Two new `events` payload shapes (`intent_detected`, `routing_failed`) — additive, same pattern as M1's `llm_call_succeeded`/`rate_limited`.

---

## API Changes

- `POST /api/chat` — safe messages now get either a real teaching reply (unchanged from M1) or a clarifying question, depending on routing confidence. Response shape unchanged.

---

## UI Changes

None — a clarifying question renders as a normal assistant message, same as any other reply.

---

## Testing Performed

- **Unit tests (mocked classification, `router-agent.ts` against real source):** 15 assertions covering high-confidence single-intent, multi-intent (secondary preserved, primary acted on), low-confidence with a model-provided clarification question, low-confidence with no question (falls back to a default), the exact threshold boundary (`confidence === 0.8` → not clarified, confirming `<` not `<=`), and classification failure propagating rather than being swallowed.
- **Live verification of the real Claude structured-output call** (`classifyIntentWithClaude`, first use of `messages.parse()` + `zodOutputFormat` in this codebase): 5 real requests — a clear concept question, a clear practice request, a clear assessment request, a genuine multi-intent message ("explain fractions and then quiz me" → primary `Learning`, secondary `Assessment`, correctly matching the spec's own category definitions rather than the earlier plan's illustrative guess of `Practice`), and an ambiguous message ("I don't get this" → confidence `0.3`, a real generated clarification question). All parsed correctly with no schema validation failures.
- **Safety regression re-run:** the same 24-phrase M1-06 test re-verified unchanged (`checkMessageSafety()` itself wasn't touched), plus a structural re-check that `classifyIntent`/`generateTeachingReply` both remain inside `route.ts`'s single safe-branch `if`/`else` — the router insertion didn't create a second path into either Claude call for unsafe content.
- `npm run build` — clean, zero TypeScript errors.
- Dev server smoke test — unauthenticated `/api/chat` still returns `401`, confirming the new imports (including `zod`) don't break server startup or the module graph.

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| Correct intent category for clear requests | ✅ Verified live across Learning/Practice/Assessment |
| Low-confidence requests get a clarifying question, not a guess | ✅ Verified live (0.3 confidence → real clarification question) and unit-tested at the exact threshold boundary |
| Safety filter and rate limiting still gate everything upstream, unchanged | ✅ Confirmed — both checks remain before the safe/unsafe branch, untouched |
| Zero new Claude calls for unsafe/rate-limited messages | ✅ Re-verified structurally, same guarantee as M1-06 |
| Router Agent never generates teaching content | ✅ By construction — `classifyIntent()` has no path that produces reply text other than the clarification question |
| `IntentObject` is a reusable, dependency-free contract | ✅ `intent-object.ts` has zero imports |
| Confidence threshold is configurable, not hardcoded | ✅ `ROUTING_CONFIDENCE_THRESHOLD` exported constant |
| Secondary intent detected and available for future use | ✅ Verified live on a real multi-intent message |
| No new database schema | ✅ Met |
| Clean build | ✅ Met |

---

## Lessons Learned

- A dependency-injection seam (`classify` as a parameter instead of an internal import) that was added purely for testability turned out to also be the cleanest way to express "this module doesn't know how classification happens, only what to do with the result" — the testability fix and the architectural goal were the same change.
- Verifying a multi-intent classification against the spec's own category definitions (not against an example written from memory in the planning conversation) caught that "quiz me" is explicitly an Assessment-category phrase per the spec, not Practice as the illustrative plan example had guessed — worth trusting the live model output against the source spec over a hand-written example when they disagree.

---

## Open Issues

- **Two sequential Claude calls per answerable message** (classify, then reply) — a deliberate, agreed trade-off for keeping Router and teaching generation separate. Worth revisiting if per-message cost becomes a real constraint (e.g., a cheaper/faster model for classification specifically).
- **The Router spec's <150ms intent-detection latency target is not met** and isn't realistically achievable with an LLM-based, contextual classifier — documented as accepted, not solved.
- **No curriculum/topic taxonomy document exists** — `topic`/`subtopic` remain free text, not validated against any structured hierarchy. Becomes load-bearing at M3 (Planning Agent, which the roadmap already flags as needing a Curriculum Graph) and M5 (Knowledge Retrieval).
- **`secondaryIntent` is detected and logged but never acted on** — by design this milestone; nothing downstream exists yet to hand it to.
- Carried from M1: no client-side UX for `429`, rate-limit threshold not data-derived, no org-wide Claude spend cap.

---

## Next Task

M2 gate review, mirroring M0 and M1's milestone closure process.
