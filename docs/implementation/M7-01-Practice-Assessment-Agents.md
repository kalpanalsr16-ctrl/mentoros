# M7-01 — Practice Agent + Assessment Agent

**Status:** ✅ Completed (scoped; see Open Issues for what's deliberately deferred)
**Date:** 2026-07-11

---

## Objective

Add the Practice Agent (`05_Agent_Architecture/09_Practice_Agent.md`) and Assessment Agent (`10_Assessment_Agent.md`), and — for the first time since Router Agent (M2) started classifying `primaryIntent` — actually branch `/api/chat`'s behavior on that classification instead of always falling through to the same Concept-Agent-or-fallback path regardless of what the student asked for.

---

## Why This Task Exists

Bundled per `08_Roadmap.md`: "Assessment cannot be meaningfully tested without Practice already existing." Both depend on Concept Agent (M6), Planning (M3), Personalization (M4) — all now exist. Router Agent has classified `Practice`/`Assessment`/`Learning`/etc. as distinct intents since M2, but until this milestone nothing downstream ever looked at that classification beyond the confidence-based clarification check — every non-clarification turn ran the same path. This was a real, quietly-carried gap, not something either spec named directly.

---

## Scope Decisions (agreed before implementation)

**1. Gating: Router's own intent, not Planning's Diagnostic strategy.** M6's Concept Agent requires `plan.strategy !== "Diagnostic"`. Practice and Assessment Agents deliberately do **not** reuse that gate — Planning's Diagnostic-vs-not decision is about whether to diagnose before *explaining* a concept; it isn't a judgment about whether to honor an explicit "give me practice questions" request or a direct answer submission. Practice Agent requires `routerResult.intent.primaryIntent === "Practice"` and a resolved concept; Assessment Agent requires `primaryIntent === "Assessment"` (concept optional — it can still evaluate a free-form answer without one). Consequence: **unlike M6, these two agents actually fire live today**, since they don't depend on `LearnerState.isKnown` ever becoming `true`.

**2. No new persisted state.** Both specs describe writes (`Learning State` practice progress, `Assessment State`, cross-session mastery tracking) that would require infrastructure this project doesn't have yet (no Memory Agent until M8). Consistent with M3/M4/M6: results are logged as observability events (`practice_generated`, `assessment_completed`, etc.) but not persisted anywhere a later turn could read them back structurally.

**3. "Concept Agent Output" and "Practice Context" are read from conversation history, not a new store.** Practice Agent's spec'd input "Concept Agent Output" and Assessment Agent's spec'd input "Practice Context" (the original question) both assume some prior agent's structured output is retrievable later. Nothing in this codebase persists an agent's structured output between turns — every agent reads the same `ClaudeMessage[]` conversation history everything else already uses. For Assessment specifically, `extractPracticeContext()` takes the immediately preceding assistant message as a best-effort stand-in for the spec's richer Practice Context (which also includes difficulty level and hint history — neither tracked anywhere). Documented as a deliberate simplification, not the full spec'd shape.

**4. Mastery status is derived, not model-generated.** The model only produces `masteryScore` (0–100); `status` (`Mastered`/`Proficient`/`Developing`/`NeedsSupport`/`Beginner`) is computed deterministically by `deriveMasteryStatus()` against the spec's exact Mastery Levels table, rather than trusting the model to apply the table consistently on every call.

---

## Architecture Decisions

- **Both agents follow the exact pattern M6 established**: an `*AgentContext` type composing already-existing inputs (no new provider), an injected-`generate`-function orchestration wrapper (`createPracticeSet`/`evaluateResponse`, mirroring `explainConcept`/`classifyIntent`'s seam), a pure `build*SystemPrompt()` string-builder grounded directly in the spec's own sections, a `format*AsReply()` composing structured output into the plain-text message the chat surface actually stores, and structured output via `messages.parse()` + zod in `lib/llm/client.ts`.
- **`planningContext`/`plan`/`profile` are now computed once per turn and shared** across whichever of Practice/Assessment/Concept Agent actually runs — hoisted out of the try block that used to scope them to Concept Agent alone, since all three need the same Planning/Personalization output and differ only in which one executes.
- **Mutual exclusivity by construction**: at most one of Practice/Assessment/Concept Agent is ever attempted per turn (`primaryIntent` can't be two things at once; Concept Agent's own condition explicitly checks neither of the other two was attempted). Whichever was attempted and failed falls open into the same `generateTeachingReply()` free-text path used when none of them applied — never a raw error to the student.
- **Practice Agent's difficulty scale (`Beginner`/`Easy`/`Medium`/`Advanced`/`Challenge`) is kept distinct from Planning's three-level `difficulty`** (`Beginner`/`Intermediate`/`Advanced`), per the spec's own Difficulty Levels section — Practice's scale is finer-grained by design, informed by but not forced to equal Planning's recommendation.

---

## Files Created

- `web/src/lib/agents/practice-agent.ts` — `PracticeAgentContext`, `PracticeSet`, `PracticeDifficulty` types; `createPracticeSet()`; `formatPracticeSetAsReply()`; `buildPracticeAgentSystemPrompt()`.
- `web/src/lib/agents/assessment-agent.ts` — `AssessmentAgentContext`, `AssessmentReport`, `MasteryStatus`, `RecommendedNextStep` types; `MASTERY_LEVEL_THRESHOLDS`; `deriveMasteryStatus()`; `extractPracticeContext()`; `evaluateResponse()`; `formatAssessmentReportAsReply()`; `buildAssessmentAgentSystemPrompt()`.

## Files Modified

- `web/src/lib/llm/client.ts` — added `PracticeSetSchema`/`generatePracticeSet()` and `AssessmentReportSchema`/`generateAssessment()` (the latter merges the model's `masteryScore` with a locally-derived `status` before returning).
- `web/src/app/api/chat/route.ts` — `planningContext`/`plan`/`profile` hoisted above a three-way branch on `routerResult.intent.primaryIntent`: `"Practice"` → Practice Agent; `"Assessment"` → Assessment Agent; anything else → M6's existing Concept-Agent-or-fallback path, unchanged. New events: `practice_generated`, `practice_generation_failed`, `assessment_completed`, `assessment_failed`.

---

## Database Changes

None. Four new event names, additive only to the existing `events` table.

---

## API Changes

None externally. Internally, the reply's *content* and the events logged for a given turn now depend on Router's intent classification for the first time.

---

## Testing Performed

- **11 unit assertions against `practice-agent.ts`** (mocked): `createPracticeSet` passes context through and fails open; `formatPracticeSetAsReply` numbers questions and leads with the learning goal; `buildPracticeAgentSystemPrompt` includes the concept, learning objective, misconception (for misconception targeting), Planning's strategy/difficulty/rationale, all five output field names, all five difficulty levels, and degrades gracefully when objectives/misconceptions/strategies are empty.
- **24 unit assertions against `assessment-agent.ts`** (mocked): `deriveMasteryStatus()` verified at every documented boundary (0, 39/40, 59/60, 74/75, 89/90, 100); `extractPracticeContext()` correctly finds the immediately preceding assistant message, returns `""` when there isn't one, and picks the *closest* preceding assistant turn rather than an earlier one; `evaluateResponse` passes context through and fails open; `formatAssessmentReportAsReply` appends the mastery estimate; `buildAssessmentAgentSystemPrompt` includes the concept, practice context, misconception, Planning's strategy/rationale, all four output field names, all five `recommendedNextStep` options, and handles a `null` concept gracefully.
- Re-ran the full existing suite — M5's `PostgresKnowledgeProvider` (5), `TrigramConceptSearchProvider` + Planning Agent end-to-end (11), M6's `concept-agent.ts` (13), and the safety regression (24) — all 53 still passing, confirming this milestone's `route.ts` restructuring didn't disturb any prior wiring.
- `npm run build` — clean, zero TypeScript errors. `npx eslint` on all changed files — zero warnings (caught and fixed one unused import during this pass).
- Dev server smoke test — unauthenticated `/api/chat` still returns `401`.
- No `TODO`/`FIXME`/`XXX` markers found in `web/src`.
- **Not yet verified live against a real Claude call** — same authentication constraint noted throughout M5/M6; unlike M6, this branch does *not* wait on M8, so a live authenticated test (once credentials are available) should actually be able to exercise it.

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| Practice Agent generates a structured, curriculum-aligned `PracticeSet` | ✅ Met |
| Assessment Agent produces a structured `AssessmentReport` with a spec-consistent mastery status | ✅ Met (`deriveMasteryStatus()` enforces the table exactly) |
| Router's `primaryIntent` classification actually changes chat behavior for the first time | ✅ Met |
| Gated on Router's intent, not Planning's Diagnostic strategy — fires live, doesn't wait on M8 | ✅ Met, and a deliberate divergence from M6's gate, agreed before implementation |
| No new data-access abstraction; both agents built from already-existing inputs | ✅ Met |
| Failure of either agent falls open into the existing free-text reply path | ✅ Met, same convention as Router/Planning/Concept Agent |
| Clean build | ✅ Met |

---

## Lessons Learned

- Router Agent (M2) had been classifying `Practice`/`Assessment` intents for four milestones without anything downstream ever acting on that classification — worth periodically checking whether an existing signal is actually being consumed, not just produced, since "the data exists somewhere" and "something reads it" are different claims.
- Re-examining M6's gating rule rather than copying it by default (Diagnostic gate for Concept Agent, intent-only gate for Practice/Assessment) avoided compounding a live-verification gap across three milestones for a reason that didn't actually apply to two of them — worth asking "does this precedent's *reason* still hold" rather than "does this precedent exist," each time a new gate is needed.

---

## Open Issues

1. **Not yet exercised live** — same authentication constraint as M5/M6; unit-tested only. Unlike M6, this is expected to be resolvable without waiting on M8, since neither Practice nor Assessment depends on `LearnerState.isKnown`.
2. **`extractPracticeContext()`'s simplification is a real, accepted limitation** — it takes the nearest preceding assistant message as "the question," regardless of whether that turn was actually a generated practice question, a Concept Agent explanation, or a plain fallback reply. A student answering a question from several turns back, or answering out of order, won't be captured correctly. Revisit once there's a real reason to track practice-question provenance explicitly (e.g., once Reflection/Memory, M8, need it too).
3. **No adaptive practice across sessions, no progressive hint strategy, no persisted mastery** — all deliberately deferred, same reasoning as M6's deferred retry loop: no Learning State/Assessment State writer exists, and no Memory Agent (M8) exists to consume one yet.
4. **Practice Agent's misconception targeting and Assessment Agent's misconception detection are prompt-guided, not independently verified** — the system prompts ask the model to probe for and detect the listed misconceptions, but nothing in this codebase checks that a generated practice question *actually* tests a named misconception, or that a detected misconception in an assessment is genuinely present in the answer. Spec-following, not independently validated.

---

## Next Task

M7 gate review, mirroring M0–M6's milestone closure process.
