# M4-01 — Personalization Agent

**Status:** ✅ Completed
**Date:** 2026-07-11

---

## Objective

Add the Personalization Agent (`05_Agent_Architecture/06_Personalization_Agent.md`): determine *how* MentorOS should teach a specific learner — style, pace, difficulty, example type, encouragement, hint level — building on Planning Agent's *what to do* (M3) without duplicating or overriding Planning's strategy decision.

---

## Why This Task Exists

M3 gave MentorOS a teaching strategy (Diagnostic, ConceptFirst, etc.) but no notion of *how* to execute it for a specific learner — a beginner and an advanced student both asking a "new concept" question would get an identical ConceptFirst reply. Personalization Agent is next per `08_Roadmap.md`, and its own spec is explicit that it does not decide strategy — that's Planning's job — only the tactical teaching "flavor" within whatever strategy Planning already chose.

---

## Requirements

- Personalization Agent must not decide learning strategy — that remains Planning Agent's responsibility, per the spec's own Out of Scope section.
- Reuse M3's existing data (`LearnerState`, `LearningPlan`) rather than introducing a new provider abstraction for the same underlying learner concept.
- Produce a `PersonalizationProfile` reflecting the spec's own dimensions (teaching style, difficulty, pace, examples, encouragement, hint level).
- The profile — not Planning's raw output — must be what actually reaches the student-facing reply.
- No new database schema, no new environment variables.

---

## Architecture Decisions

- **`LearnerState` (M3) was extended, not replaced, with `preferredLearningStyle`.** Personalization's inputs (grade, confidence, mastery) are the same "learner state" concept M3 already modeled — adding a second provider abstraction for the same data would have been a duplicate seam, not a meaningful boundary.
- **`PersonalizationContext` composes `PlanningContext` and the computed `LearningPlan`**, rather than flattening them into a new duplicate set of fields — reflects that Personalization genuinely depends on Planning's output, per the spec's own dependency list, while keeping provenance clear.
- **`decidePersonalization()` is a pure function**, same shape as `decidePlan()` — no I/O, takes a `PersonalizationContext`, returns a `PersonalizationProfile`. Every branch of the spec's Personalization Strategies (Low Confidence Learner, High Mastery Learner, Young Learner, standard/Intermediate default, plus the unknown-learner fallback) is directly unit-testable.
- **Personalization's profile supersedes Planning's raw guidance in the prompt.** `route.ts` no longer calls `describeLearningPlanForPrompt()` directly — Planning's plan still feeds into `decidePersonalization()`'s reasoning (e.g. `plan.strategy === "PracticeFirst"` triggers the High Mastery branch), but the text that actually reaches `generateTeachingReply()` comes from Personalization, matching the spec's description of itself as "a single source of truth for personalization" that every downstream agent should follow. `describeLearningPlanForPrompt()` itself is untouched and still exported/tested from M3 — just no longer called from the route.
- **Precedence order in `decidePersonalization()`**: unknown learner → low confidence → high mastery (Planning's `PracticeFirst`) → young learner (grade-based) → standard/intermediate default. Low confidence deliberately overrides even a young-learner grade signal (verified by test), since an unconfident learner needs gentler pacing regardless of age.
- **`YOUNG_LEARNER_MAX_GRADE` (5) is a named, exported constant**, not inlined, matching the same tunability precedent as `HIGH_MASTERY_THRESHOLD` (M3) and `ROUTING_CONFIDENCE_THRESHOLD` (M2).
- **Personalization fails open** into the same `planning_failed` event and unguided M1 reply as a Planning failure — both are covered by one `try`/`catch` around the combined Planning+Personalization sequence, since neither has any I/O failure mode today (both operate on already-fetched, in-memory data) and splitting the try/catch would have added ceremony without a real distinguishable failure case yet.

---

## Files Created

- `web/src/lib/agents/personalization-context.ts` — `PersonalizationContext` type.
- `web/src/lib/agents/personalization-agent.ts` — `YOUNG_LEARNER_MAX_GRADE`, `PersonalizationProfile`, `decidePersonalization()`, `describePersonalizationForPrompt()`.

## Files Modified

- `web/src/lib/learner/learner-state.ts` — added `PreferredLearningStyle` and the `preferredLearningStyle?` field to `LearnerState`.
- `web/src/app/api/chat/route.ts` — after Planning's plan is computed and logged, builds the `PersonalizationContext`, decides a profile, logs `personalization_profile_created`, and passes the profile's guidance (not Planning's raw guidance) into `generateTeachingReply()`.

---

## Database Changes

None. One new `events` payload shape (`personalization_profile_created`) — additive, same pattern as M1–M3.

---

## API Changes

- `POST /api/chat` — a safe, routed, non-clarification message's reply now reflects a personalization profile (style/pace/difficulty/examples/encouragement/hints), not just Planning's raw strategy guidance. Response shape unchanged.

---

## UI Changes

None — a personalized reply renders as a normal assistant message.

---

## Testing Performed

- **19 unit assertions against `decidePersonalization()`**, pure function, hand-built contexts: unknown-learner fallback, low-confidence learner (softened difficulty/pace regardless of Planning's raw values), high-mastery learner via Planning's `PracticeFirst` signal, young learner via grade threshold (including the exact boundary value), standard/intermediate default, explicit `preferredLearningStyle` honored when no stronger signal overrides it, and precedence confirmed (low confidence wins over a young-learner grade signal).
- **Live verification against the real Claude API**: built a real `PersonalizationContext` from the actual unknown-learner provider and the real NCERT-backed curriculum provider, computed a real profile, and confirmed `generateTeachingReply()` produced a genuinely step-by-step, encouraging, real-life-example reply matching the profile. Repeated with a simulated young/low-confidence learner state and confirmed the reply again matched its (different) profile.
- **Safety regression** (24 phrases) re-run and passing; structural re-verification that `classifyIntent`, `buildPlanningContext`, `decidePersonalization`, and `generateTeachingReply` all remain inside `route.ts`'s single safe-branch `if`/`else`.
- `npm run build` — clean, zero TypeScript errors.
- Dev server smoke test — unauthenticated `/api/chat` still returns `401`.
- No `TODO`/`FIXME`/`XXX` markers found in `web/src`.

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| Personalization Agent does not decide learning strategy | ✅ By construction — `decidePersonalization()` reads `plan.strategy` but never sets or overrides it |
| Reuses M3's `LearnerState`/`LearningPlan` rather than a new provider | ✅ `LearnerState` extended, not duplicated |
| Produces a `PersonalizationProfile` covering the spec's dimensions | ✅ teachingStyle, difficulty, pace, exampleStyle, encouragement, hintLevel all present |
| Profile (not Planning's raw guidance) reaches the reply | ✅ Verified in `route.ts` and live |
| Every named strategy branch is correct | ✅ 19/19 unit assertions, including precedence ordering |
| Fails open on error | ✅ Same `try`/`catch` as Planning, logs `planning_failed` |
| Zero new Claude calls for unsafe/rate-limited messages | ✅ Re-verified structurally |
| No new database schema | ✅ Met |
| Clean build | ✅ Met |

---

## Lessons Learned

- Recognizing that Personalization's inputs were mostly *already-modeled* data (M3's `LearnerState`) rather than a genuinely new data source avoided inventing a redundant abstraction — worth checking "does this already exist under a different agent's name" before reaching for a new interface.
- Testing precedence explicitly (low confidence vs. young-learner grade signal) caught that the branch *order* in the pure function is itself a real design decision worth a dedicated test, not just each branch in isolation.

---

## Open Issues

- **Every real learner is still `isKnown: false`** (carried from M3) — the fallback profile branch will dominate production until M7/M8. Low Confidence, High Mastery, and Young Learner branches are fully implemented and tested but won't be exercised live until real learner data exists.
- **`preferredLearningStyle` has no real data source yet** — nothing writes it (would come from explicit learner input or inferred behavior, neither built yet); it's modeled and read, matching the same "correct to model ahead of a writer" stance M3 took for the rest of `LearnerState`.
- Carried from M2/M3: two Claude calls per answerable message (classify, then reply) — Personalization adds no new API call, same as Planning.
- Carried from M0–M3: no client-side UX for `429`, no org-wide Claude spend cap, `07_Evaluation_Framework.md`/`10_Observability.md` still empty, Preview/Staging behind Production.

---

## Next Task

M4 gate review, mirroring M0–M3's milestone closure process.
