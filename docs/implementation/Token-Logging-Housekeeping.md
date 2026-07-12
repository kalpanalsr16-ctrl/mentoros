# Token-Logging Housekeeping Pass

**Status:** ✅ Completed
**Date:** 2026-07-13

---

## Objective

Make every LLM-based agent record `model`, token usage (`inputTokens`/`outputTokens`), `latencyMs`, and `estimatedCostUsd` consistently on its own event — closing Open Issues 1 and 5 from [M9-02-Observability-Agent.md](M9-02-Observability-Agent.md), surfaced by that milestone's own aggregation work and confirmed still open by the [M0–M9 Production Verification Sweep](M0-M9-Production-Verification-Sweep.md).

---

## Why This Task Exists

Before this pass, only the M1 fallback path (`llm_call_succeeded`) logged token usage — every structured-output call added since (Router, Safety Layer 2, Concept, Practice, Assessment, Reflection, Evaluation) discarded `response.usage` even though the Anthropic SDK returns it on every call. This made Observability Agent's cost/token aggregation silently incomplete for the overwhelming majority of real traffic (any turn that wasn't the M1 fallback), and made it impossible to answer "what does MentorOS actually cost to run" with any confidence ahead of scaling traffic.

---

## Architecture Decisions

- **One shared `estimateCostUsd(inputTokens, outputTokens)` helper**, exported from `lib/llm/client.ts` (the one file that knows `MODEL` and its pricing), rather than computing cost inline at each of the ~8 call sites in `route.ts` — so "estimated cost" means the same arithmetic everywhere, not eight independent copies that could drift.
- **`observability-agent.ts` keeps its own separate, hardcoded pricing constants**, unchanged by this pass — that duplication is deliberate (see that file's own doc comment): it's a read-only reporting module and was built with no runtime dependency on the Anthropic SDK. `client.ts`'s `estimateCostUsd` and `observability-agent.ts`'s inline computation now happen to use the same two numbers, but are not wired together; if `MODEL`'s pricing ever changes, both need updating.
- **Latency is measured by the caller (`route.ts`), not inside `lib/llm/client.ts`**, matching the pattern the M1/Concept/Practice/Assessment path already established (`llmStartedAt`/`llmLatencyMs`). Router, Safety Layer 2, and Reflection didn't have this timing at all before this pass; it was added at each of their call sites the same way.
- **Safety Agent's `SafetyAssessment` type gained optional `model`/`inputTokens`/`outputTokens`** (not required) — Layer 2's Claude call only runs when Layer 1 didn't already flag the message, so these fields are genuinely absent (not zero) when Layer 1 alone decided the outcome, or when Layer 2's own call failed (the fail-closed branch). The event payload only includes cost/token fields when they're actually present, so a `message_received`/`safety_blocked` event never claims a cost that wasn't incurred.
- **Evaluation Agent's own call metadata is logged under distinctly-named fields** (`evaluationLatencyMs`/`evaluationInputTokens`/`evaluationOutputTokens`/`evaluationCostUsd`) in `evaluation_completed`, separate from the existing `latencyMs` field passed into its context — that field is the *source* agent's (Concept/Practice/Assessment) latency, which Evaluation's `computeEfficiencyScore()` scores the source agent against, and was left untouched. Conflating the two would have silently broken efficiency scoring.
- **Memory Agent has no LLM call of its own** (pure, deterministic merge function, per M8) — nothing to log there; not an oversight.
- **Every generative agent wrapper function** (`explainConcept`, `createPracticeSet`, `evaluateResponse`, `reflectOnSession`, `evaluateInteraction`) already returns the underlying `lib/llm/client.ts` result type unmodified (a pure pass-through to the injected `generate` function), so adding the fields to `client.ts`'s result types was sufficient for those five — no changes needed in the agent files themselves. Router Agent (`classifyIntent`) and Safety Agent (`evaluateSafety`) each reshape the result into their own narrower type (`RouterResult`, `SafetyAssessment`), so those two needed an explicit pass-through edit.

---

## Files Modified

- `web/src/lib/llm/client.ts` — added `estimateCostUsd()` (exported) and its two pricing constants; added `inputTokens`/`outputTokens` to the success variant of `RouterClassificationResult`, `SafetyClassificationResult`, `ConceptAgentResult`, `PracticeAgentResult`, `AssessmentAgentResult`, `ReflectionAgentResult`, `EvaluationAgentResult` (all seven structured-output result types; `LLMReplyResult` already had them since M1).
- `web/src/lib/agents/router-agent.ts` — `RouterResult` gained `inputTokens`/`outputTokens`; `classifyIntent()` passes them through from the underlying classification result.
- `web/src/lib/agents/safety-agent.ts` — `SafetyAssessment` gained optional `model`/`inputTokens`/`outputTokens`; `evaluateSafety()` passes them through from Layer 2's result when it ran and succeeded.
- `web/src/app/api/chat/route.ts` — added timing (`Date.now()` before/after) for the Router call and the Safety Agent call (neither was timed before); added `model`/`inputTokens`/`outputTokens`/`estimatedCostUsd` to `intent_detected`, `message_received`/`safety_blocked` (when Layer 2 ran), `practice_generated`, `assessment_completed`, `concept_explained`, `reflection_completed` (also newly timed), and `llm_call_succeeded`; added `evaluationInputTokens`/`evaluationOutputTokens`/`evaluationCostUsd`/`evaluationLatencyMs` to `evaluation_completed` and `latencyMs` to `routing_failed`/`evaluation_failed`/`reflection_failed`.
- `docs/implementation/M9-02-Observability-Agent.md` — Open Issues 1 and 5 marked resolved with a pointer to this document; Next Task section updated.

## Files Created

- `docs/implementation/Token-Logging-Housekeeping.md` (this file).

---

## Database Changes

None. `events.payload` is `jsonb` — no schema change needed to add new keys.

---

## Testing Performed

- New unit assertions for `estimateCostUsd()` (zero tokens → zero cost; 1M/1M → exactly $5 + $25; matches the arithmetic `observability-agent.ts` independently computes) — 3 assertions, all passing.
- Re-ran the full existing regression suite (176 assertions across M5–M9's mocked agent tests) — all still passing; none of the type changes broke an existing mock, since every mocked `generate`/`classify` function in those tests already returns plain objects that TypeScript's structural typing (and the strip-types test runner, which doesn't type-check at all) tolerated the additional optional/required fields on.
- `npm run build` — clean, zero TypeScript errors (confirms every new field is correctly threaded end-to-end, since `route.ts` accesses `.inputTokens`/`.outputTokens` on each result type directly).
- `npm run lint` — clean.
- Not re-run live: this pass only changes what gets logged into `payload`, not any student-facing behavior or control flow, so the live authenticated checklist from the Production Verification Sweep wasn't re-run. If a future admin surface is ever wired up to read `events` (Observability Agent's own Open Issue 2), that would be the first opportunity to visually confirm these new fields land correctly in production.

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| Every LLM-based agent logs `model` | ✅ Met (was already true for most; Router/Safety/Reflection didn't have latency before, now do) |
| Every LLM-based agent logs token usage | ✅ Met — closes Open Issue 1 |
| Every LLM-based agent logs latency | ✅ Met — Router and Safety Agent timed for the first time; Reflection timed for the first time |
| Every LLM-based agent logs estimated cost | ✅ Met, via one shared `estimateCostUsd()` helper |
| Evaluation Agent's own call cost is distinguishable from the source agent's cost | ✅ Met — closes Open Issue 2 (M9-02's Open Issue 5) |
| No behavior change to replies, routing, or gating | ✅ Met — purely additive to event payloads |
| Clean build/lint, full regression suite still passing | ✅ Met |

---

## Lessons Learned

- Checking whether each agent's wrapper function was a pure pass-through *before* editing it avoided unnecessary changes — five of seven generative agents needed zero code changes beyond `client.ts` itself, since they were already simple pass-throughs by design (the M6-era "seam" pattern paid for itself here).
- Evaluation Agent's context already carried a `latencyMs` field with a specific, load-bearing meaning (the source agent's efficiency input) — naming the new fields `evaluationLatencyMs` etc. rather than overloading the existing name was a deliberate choice to avoid a subtle, hard-to-spot bug where Evaluation's own latency would have silently replaced or been confused with the value its own scoring logic depends on.

---

## Next Task

Both follow-ups from M9-02 are now closed. `08_Roadmap.md`'s M0–M9 scope is complete, verified live, and its cost/usage observability gap is closed. Per the product owner's explicit sequencing, a genuinely new milestone beyond the original roadmap can now be defined.
