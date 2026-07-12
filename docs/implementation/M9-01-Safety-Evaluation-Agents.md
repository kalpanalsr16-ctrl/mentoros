# M9-01 — Safety Agent (full) + Evaluation Agent

**Status:** ✅ Completed (scoped; see Open Issues for what's deliberately deferred)
**Date:** 2026-07-12

---

## Objective

Replace M0's deterministic-only safety filter with the full Safety Agent (`05_Agent_Architecture/03_Safety_Agent.md`) — a two-layer gate that runs before every other agent, enforcing an Allow/Block decision per `11_Policy_Engine.md`. Add the Evaluation Agent (`13_Evaluation_Agent.md`) — an internal, post-generation quality scorer for every Concept/Practice/Assessment interaction, per `07_Evaluation_Framework.md`.

---

## Why This Task Exists

M9 was found blocked on all four of its original components (Safety, Evaluation, Observability, Voice) when checked against each spec's own Dependencies section — see the prior session's gap analysis and the drafted `07_Evaluation_Framework.md`/`11_Policy_Engine.md`. The product owner reviewed both drafts and made five architecture decisions (2026-07-12, see each document's Revision notes) that unblocked Safety Agent and Evaluation Agent specifically; Observability Agent and Voice Agent remain out of this milestone's scope.

---

## Architecture Decisions (product owner, 2026-07-12 — implemented here)

1. **Safety overrides every other Evaluation dimension**, implemented as a gate/ceiling (`min(safety, 39)` when the response fails a safety check), not merely the highest weight in a pooled average.
2. **M9 enforces exactly two outcomes: Allow or Block.** The originally-described "constrain the response" (Medium-risk) behavior is documented as deferred, real long-term architecture, not implemented — it needs a routing/prompt-transformation capability that doesn't exist yet. Medium folds into Block, not Allow.
3. **Safety Agent runs before Router Agent** — the first agent to touch any message. `03_Safety_Agent.md` updated to match (Router Agent removed from Dependencies, added to Supports; "Router Output" removed from Inputs).
4. **Voice Agent stays deferred indefinitely** — not touched by this milestone.
5. **`10_Observability.md` remains a later task**, not a blocker for this milestone.

---

## Architecture Decisions (implementation-level, this session)

- **Two-layer Safety Agent, not a full replacement of M0's filter.** Layer 1 is the unchanged M0 keyword filter (`checkMessageSafety`) — free, instant, and per `11_Policy_Engine.md`'s explicit requirement, the confirmed floor Layer 2 must not regress below. Layer 2 (a new Claude call, `classifySafetyWithClaude`) only runs when Layer 1 doesn't already flag the message, and only evaluates the categories that can apply pre-generation (Child Safety, Prompt Injection, Academic Integrity, Privacy, Platform Safety) — **not** Educational Safety, which requires a generated response to check groundedness against and structurally cannot apply this early in the pipeline. That concern is Evaluation Agent's, after generation.
- **`SafetyCategory` extended from four values to seven** (`self_harm`, `violence`, `sexual_content`, `prompt_injection` unchanged; `academic_integrity`, `privacy_concern`, `platform_abuse` added) with matching `buildSafetyDeclineMessage()` branches — Layer 1's deterministic patterns still only cover the original four; the three new categories are only ever produced by Layer 2.
- **Safety Agent fails CLOSED, not open, on its own Layer 2 call failure** — the one deliberate exception to this codebase's fail-open convention (every other agent — Router, Concept, Practice, Assessment, Reflection — degrades gracefully on a transient error). Safety Agent is not an enhancement layered on top of something else; it is the gate, and per `11_Policy_Engine.md`'s Confidence and Escalation principle, an unknown safety determination must not silently become Allow. Real, stated consequence: a transient Anthropic API outage blocks every message platform-wide for as long as it lasts, rather than degrading gracefully.
- **Evaluation Agent triggers after Concept, Practice, *or* Assessment Agent succeed** — broader coverage than M8's Reflection (which only hooks Assessment), matching `13_Evaluation_Agent.md`'s own Events Consumed and its "100% of learner interactions" coverage target.
- **The model is only asked for six dimensions** (Groundedness, Accuracy, Educational Quality, Personalization, Clarity, Safety); **Efficiency, `overallScore`, `qualityStatus`, and `hallucinationRisk` are all computed deterministically** in TypeScript, mirroring `deriveMasteryStatus()`'s precedent from M7 — don't trust the model for a value you can compute exactly yourself.
- **`overallScore`'s null-groundedness case renormalizes weights** rather than treating a not-evaluable dimension as zero — `computeWeightedScore()` sums only the weights of dimensions that actually have a value, so a `null` groundedness (Assessment evaluating a free-form answer with no resolved concept) doesn't silently depress the score by a sixth.
- **Evaluation Agent is entirely internal** — never shown to the student, doesn't change `replyContent`, wrapped in its own try/catch separate from Reflection/Memory's, per `13_Evaluation_Agent.md`'s own stated principle: "Evaluation should never block learner interactions."

---

## Files Created

- `web/src/lib/agents/safety-agent.ts` — `SafetyAssessment`, `RiskLevel` types; `deriveSafetyAction()`; `evaluateSafety()`.
- `web/src/lib/agents/evaluation-agent.ts` — `EvaluationAgentContext`, `EvaluationReport`, `QualityStatus`, `HallucinationRisk`, `EvaluationSourceAgent` types; `computeOverallScore()`, `deriveQualityStatus()`, `deriveHallucinationRisk()`, `computeEfficiencyScore()` (all pure); `evaluateInteraction()`; `buildEvaluationAgentSystemPrompt()`.

## Files Modified

- `web/src/lib/safety/filter.ts` — `SafetyCategory` extended to seven values; `buildSafetyDeclineMessage()` gets three new branches; doc comment updated to describe Layer 1's role in the new two-layer model.
- `web/src/lib/llm/client.ts` — added `classifySafetyWithClaude()` (Layer 2's structured classification) and `generateEvaluation()` (Evaluation's structured scoring + deterministic post-processing).
- `web/src/app/api/chat/route.ts` — the safety check moved from a synchronous, pre-history call to a two-layer gate running after the user's message is saved (so Layer 2 has conversation history to reason over); `runEvaluationAgent()` helper added and called from all three of Practice/Assessment/Concept Agent's success branches.
- `05_Agent_Architecture/03_Safety_Agent.md` — Dependencies/Inputs corrected for Safety-before-Router; Outputs example and Risk Levels section annotated with the binary-action revision.
- `07_Evaluation_Framework.md`, `11_Policy_Engine.md` — see their own Revision notes (previous session).

---

## Database Changes

None. New event names: `safety_blocked` payload enriched with `riskLevel`/`confidence`; `evaluation_completed`, `evaluation_failed`, `low_quality_detected`, `hallucination_detected` — all additive to the existing `events` table.

---

## API Changes

None externally. Internally: every message now passes through Safety Agent before Router runs at all (previously, M0's filter ran but the *shape* of the gate — logged event, saved message, decline branch — is the same; only the check itself changed). A successful Concept/Practice/Assessment turn now also triggers an additional internal Evaluation Agent call.

---

## Testing Performed

- **16 unit assertions against `safety-agent.ts`** (mocked): the complete `deriveSafetyAction` mapping (Low→Allow, Medium/High/Critical→Block); Layer 1 flagging short-circuits before Layer 2 is ever called; Layer 2 Low/Medium/High/Critical each produce the correct action; **Layer 2's own call failure fails closed** (Block), confirmed explicitly as the deliberate exception to fail-open.
- **31 unit assertions against `evaluation-agent.ts`** (mocked/pure): the Safety-overrides gate verified at two different safety scores (39 cap, and a lower score passing through uncapped); the weighted average verified both with all-equal dimensions and with an isolated single dimension contributing exactly its stated weight share; null-groundedness renormalization verified to reproduce the same score as if the dimension were simply absent from the pool; `deriveQualityStatus`/`deriveHallucinationRisk` verified at every documented band boundary; `computeEfficiencyScore` verified at, under, and over each agent's own latency target; `evaluateInteraction`'s injected-function seam and fail-open behavior; system prompt content coverage.
- **3 additional assertions confirming all three new `SafetyCategory` values produce non-empty decline messages.**
- Re-ran the full existing suite — M5 (16), M6 (13), M7 (35), M8 (42), safety regression (24) — all 130 still passing, confirming this milestone's `route.ts` restructuring (moving the safety check after message-saving) didn't disturb any prior wiring.
- `npm run build` — clean, zero TypeScript errors. `npx eslint src/` — one pre-existing error in `src/lib/supabase/proxy.ts`, confirmed via `git log`/`git status` to predate this milestone.
- Dev server smoke test — unauthenticated `/api/chat` still returns `401`.
- No `TODO`/`FIXME`/`XXX` markers found in `web/src`.
- **Not yet verified live** — same authentication constraint as M5–M8.

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| Safety Agent runs before Router Agent, gating everything downstream | ✅ Met |
| M9 enforces exactly Allow/Block, Constrain documented as deferred | ✅ Met |
| Safety Agent fails closed on its own failure (deliberate exception to fail-open) | ✅ Met, verified explicitly |
| Evaluation Agent scores every Concept/Practice/Assessment interaction | ✅ Met |
| Safety overrides every other Evaluation dimension | ✅ Met, verified at the exact gate boundary |
| Efficiency/overallScore/qualityStatus/hallucinationRisk computed deterministically, never trusted from the model | ✅ Met |
| No new data-access abstraction beyond what's needed | ✅ Met |
| Evaluation never blocks the reply | ✅ Met, own try/catch |
| Clean build | ✅ Met |

---

## Lessons Learned

- Checking each spec's own Dependencies section as a hard gate (rather than treating "the spec file exists" as sufficient) surfaced a bigger, more honest picture of M9's real readiness than assuming a milestone was startable just because its agent documents existed on disk.
- Making Safety Agent the one deliberate exception to this codebase's fail-open convention — and stating that exception explicitly, with its real consequence spelled out — was more valuable than either silently following the fail-open pattern (which would contradict the safety-first priority just decided) or silently deviating from it without flagging the availability tradeoff.
- Deriving `hallucinationRisk` from `groundedness` (rather than having the model report both independently) and computing `overallScore` deterministically rather than asking for it directly continues a pattern worth repeating: whenever a spec's Outputs example includes a value that's mechanically derivable from other values in the same output, compute it, don't ask for it twice.

---

## Open Issues

1. **Not yet exercised live** — same constraint as M5–M8.
2. **The "constrain the response" behavior is fully deferred**, not partially implemented — a Medium-risk message today gets the same decline as a High-risk one. Revisit once a routing/prompt-transformation design exists for how a constrained instruction would actually reach Concept/Practice/Assessment Agent's prompts.
3. **Age-band granularity** (`11_Policy_Engine.md`'s one remaining open question) is still unresolved — Child Safety's age-appropriateness judgment currently relies on the model's own judgment plus the learner's recorded grade, without a formally reviewed age-banding document.
4. **Observability Agent and Voice Agent remain entirely out of scope** — Observability Agent is a natural fast-follow now that Evaluation Agent exists (per its own Dependencies section); Voice Agent has no spec and no target milestone.
5. **Evaluation Agent's Teaching Effectiveness dimension is not implemented** — `07_Evaluation_Framework.md` describes it as retroactive/async (requires a later signal); this milestone only implements the six same-turn dimensions.
6. **`computeEfficiencyScore`'s linear falloff is a first-pass heuristic**, not a tuned curve — revisit once real latency distribution data exists.

---

## Next Task

M9 gate review, mirroring M0–M8's milestone closure process. Given Open Issue 1, prioritize a live authenticated verification pass before closing, same recommendation carried from M8.
