# M6-01 — Concept Agent (v1, single-turn)

**Status:** ✅ Completed (scoped; see Open Issues for what's deliberately deferred)
**Date:** 2026-07-11

---

## Objective

Replace M1's free-text `generateTeachingReply(history, teachingGuidance)` call — a single prompt-guidance string, no structured output, no explicit teaching framework — with a real Concept Agent (`05_Agent_Architecture/08_Concept_Agent.md`): a structured, single-turn teaching response built from the Knowledge Package (M5), Learning Plan (M3), Personalization Profile (M4), and Context Object (M1), whenever Planning has actually resolved a concept worth teaching.

---

## Why This Task Exists

`08_Concept_Agent.md` lists Knowledge Retrieval (M5), Planning (M3), Personalization (M4), and Context (M1) as its dependencies — all four now exist, so M6 was next per `08_Roadmap.md`. Until now, "teaching" was one general-purpose Claude call with a single sentence of style guidance injected; there was no structured teaching framework, no explicit worked example vs. explanation distinction, and no forward-looking signal (`nextStep`, `confidence`) for a future Practice Agent (M7) to eventually consume.

---

## Scope Decision (agreed before implementation)

The full spec describes a stateful, multi-turn adaptive loop: retry with a different explanation strategy (max 2 retries) if the learner stays confused, write session-level Learning State progress, and periodically re-check understanding across turns. None of that is implementable honestly yet:

- **No signal exists anywhere in the pipeline for "the learner is still confused by the previous explanation."** Router Agent (M2) classifies intent categories (Learning/Practice/Assessment/Revision/Session/Platform), not confusion-with-a-prior-turn. Building a heuristic for this without Assessment/Reflection (M7/M8) actually informing it would be guessing, the same shape of gap M5 hit with the undocumented embedding provider.
- **No writer exists for any part of `LearnerState`** (carried from M3/M4) and nothing downstream reads session-lesson-progress yet, since Practice Agent (M7) doesn't exist.

Agreed scope for v1: a **single-turn** Concept Agent that runs the Connect→Explain→Illustrate→Example→Check Understanding framework *within one Claude response* (Check Understanding becomes a question at the end of the explanation; Summarize/Transition becomes the `nextStep` field), producing the spec's structured output. The retry loop, Learning State write, and true multi-turn adaptive re-explanation are explicitly deferred — same pattern M3/M4 used for what M7/M8 need.

A second scope decision: **Concept Agent only runs when `plan.strategy !== "Diagnostic"` and a concept resolved**, not merely when a concept resolved. `05_Planning_agent.md`'s Recovery Strategy is explicit — "If learner profile is incomplete: ask diagnostic questions" — Diagnostic means diagnose, not teach. Since every real learner currently reports `isKnown: false` (no writer until M7/M8), `decidePlan()` returns `"Diagnostic"` unconditionally in production today — meaning **this branch is fully implemented and tested but not yet exercised live**, the same honest situation M4's High Mastery/Young Learner branches are in.

---

## Architecture Decisions

- **`ConceptAgentContext` composes the Knowledge Package fields already resolved by M5's `PlanningContext`** (`concept` — non-null by construction, `learningObjectives`, `misconceptions`, `teachingStrategies`) plus M3's `LearningPlan`, M4's `PersonalizationProfile`, and M1's conversation history — no new data-access abstraction; every input already existed, this milestone only composes and consumes them.
- **`explainConcept(context, generate)` takes an injected generation function**, mirroring `router-agent.ts`'s `classifyIntent(history, classify)` seam exactly — the orchestration module has zero runtime dependency on the Anthropic SDK, and fails open (returns the same `{success:false, reason}` shape as every other Claude call in this codebase) rather than throwing.
- **Structured output via `messages.parse()` + a zod schema** (`TeachingResponseSchema`), the same mechanism `classifyIntentWithClaude` already established — not a new pattern.
- **The system prompt is a pure, testable string-building function** (`buildConceptAgentSystemPrompt`) living in `lib/agents/concept-agent.ts`, not `lib/llm/client.ts` — same convention `describePersonalizationForPrompt()` already set: decision/prompt-shaping logic lives in the agent file; the raw API call and its error handling live in the LLM client file.
- **The chat surface stays plain text.** `formatTeachingResponseAsReply()` joins `explanation` and `example` into the one string that's actually stored in `messages.content` — MentorOS's chat UI has no renderer for structured teaching output, so this composition happens at the boundary, not by teaching the rest of the app about the new shape.
- **`nextStep` and `confidence` are logged, not acted on.** No Practice Agent exists yet to consume a `"Practice"` recommendation, and no re-retrieval loop exists for a low-confidence result — both are forward-looking metadata for M7+ to eventually read from the `concept_explained` event, not silently wired to fake behavior now.
- **Concept Agent failure falls open into the existing M1-M5 free-text path**, exactly like every other agent failure in this route (`routing_failed`, `planning_failed`) — a `concept_explanation_failed` event is logged, then `generateTeachingReply(history, teachingGuidance)` runs unchanged, so a Concept Agent outage never blocks a reply.

---

## Files Created

- `web/src/lib/agents/concept-agent.ts` — `ConceptAgentContext`, `TeachingResponse` types; `explainConcept()`; `formatTeachingResponseAsReply()`; `buildConceptAgentSystemPrompt()`.

## Files Modified

- `web/src/lib/llm/client.ts` — added `TeachingResponseSchema`, `ConceptAgentResult`, `generateConceptExplanation()` (structured `messages.parse()` call, same error handling as every other function in this file).
- `web/src/app/api/chat/route.ts` — after Planning/Personalization compute `plan`/`profile`: if `plan.strategy !== "Diagnostic"` and a concept resolved, assemble `ConceptAgentContext` and call `explainConcept()`; on success, log `concept_explained` and use `formatTeachingResponseAsReply()` as the reply; on failure or when the gate doesn't apply, log `concept_explanation_failed` (only if it was attempted) and fall through to the unchanged `generateTeachingReply()` path.

---

## Database Changes

None. Two new event names (`concept_explained`, `concept_explanation_failed`) — additive only to the existing `events` table, same pattern as every prior milestone's new event types.

---

## API Changes

None externally — `/api/chat`'s request/response shape is unchanged. Internally, the reply's *content* now sometimes comes from the structured Concept Agent path instead of always from `generateTeachingReply()`.

---

## Testing Performed

- **13 unit assertions against `concept-agent.ts`** (mocked, no live Claude call): `explainConcept` passes its context straight through to the injected `generate` function and returns both its success and failure shapes unchanged (fail-open, no throw); `formatTeachingResponseAsReply` correctly appends the example when present and returns the bare explanation when it isn't; `buildConceptAgentSystemPrompt` includes every Knowledge Package field (concept name/description, learning objective, misconception, teaching strategy), Planning's strategy and rationale, personalization guidance text, and all five required output field names — and degrades gracefully (not `undefined`/a crash) when objectives/misconceptions/strategies are all empty.
- Re-ran the full M5 mocked suite (`PostgresKnowledgeProvider`, `TrigramConceptSearchProvider`, `buildPlanningContext`/`decidePlan`) — 16/16 still passing, confirming this milestone's changes to `route.ts` didn't disturb M5's provider wiring.
- Safety regression (24 phrases) re-run and passing.
- `npm run build` — clean, zero TypeScript errors.
- Dev server smoke test — unauthenticated `/api/chat` still returns `401`.
- No `TODO`/`FIXME`/`XXX` markers found in `web/src`.
- **Not yet verified live** — same live-authentication constraint as M5 (see M5-03's Open Issues); `plan.strategy` is unconditionally `"Diagnostic"` in production today regardless, so even with a live session this branch would not fire until M7/M8 give `LearnerState` a real writer. Live verification is therefore gated on M7/M8, not on infrastructure access.

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| Structured `TeachingResponse` replaces free-text guidance-string teaching, per the spec's Outputs section | ✅ Met |
| Built from Knowledge Package (M5) + Learning Plan (M3) + Personalization Profile (M4) + Context (M1), no new data-access abstraction | ✅ Met |
| Concept Agent only runs when Planning has decided this isn't a diagnostic moment | ✅ Met (`plan.strategy !== "Diagnostic"` gate) |
| Concept Agent failure falls open into the existing reply path | ✅ Met, same convention as Router/Planning |
| No downstream agent needed to change (Planning/Personalization/Router untouched) | ✅ Met — only `route.ts`'s wiring and `llm/client.ts` changed |
| Clean build | ✅ Met |

---

## Lessons Learned

- Reusing `router-agent.ts`'s injected-generate-function pattern for `explainConcept()` meant this milestone added zero new testing infrastructure — the same mocking approach already proven for Router Agent's `classify` seam worked immediately for Concept Agent's `generate` seam.
- Surfacing the "every learner is currently Diagnostic" reality *before* wiring the gate (rather than discovering it after deploying and wondering why Concept Agent never fires) turned what could have looked like a bug report into an explicitly documented, expected consequence of M3/M4's own carried-forward limitation.

---

## Open Issues

1. **Not yet exercised live** — blocked on the same authentication constraint as M5, and additionally on `plan.strategy` being unconditionally `"Diagnostic"` in production until M7/M8 give `LearnerState` a real writer. Fully unit-tested; unverified against a real Claude call end-to-end.
2. **Adaptive retry loop deferred** — no signal exists for "learner still confused by the previous explanation"; revisit once Assessment/Reflection (M7/M8) can provide one.
3. **Learning State write deferred** — Concept Agent's spec'd "Write: Learning State" (session progress through the lesson) isn't implemented; nothing downstream reads it yet either, since Practice Agent (M7) doesn't exist.
4. **True multi-turn Understanding Checks deferred** — the Check Understanding step is a question embedded in one response's `explanation`, not a system that reacts differently to how the student answers it next turn.
5. **`nextStep`/`confidence` are observability-only** — logged in the `concept_explained` event but not acted on; no Practice Agent to consume `"Practice"`, no re-retrieval loop for low `confidence`.

---

## Next Task

M6 gate review, mirroring M0–M5's milestone closure process — once ready to close, given the live-verification blockers above are expected to persist until M7/M8.
