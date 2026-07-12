# M8-01 — Reflection Agent + Memory Agent

**Status:** ✅ Completed (scoped; see Open Issues for what's deliberately deferred)
**Date:** 2026-07-12

---

## Objective

Add the Reflection Agent (`05_Agent_Architecture/11_Reflection_Agent.md`) and Memory Agent (`12_Memory_Agent.md`), and — for the first time since M3 — replace `unknownLearnerStateProvider` with a real, Postgres-backed implementation. This is the milestone where `LearnerState.isKnown` can finally become `true` for a real student, unblocking the branches M4 (High Mastery / Young Learner personalization) and M6 (Concept Agent, gated on `plan.strategy !== "Diagnostic"`) have been carrying as "fully tested, not yet exercised live" since they were built.

---

## Why This Task Exists

Bundled per `08_Roadmap.md`: Reflection depends on Assessment + Practice (M7); Memory depends directly on Reflection. Both now exist. Every prior milestone from M3 onward has correctly reported every real learner as `isKnown: false`, since nothing ever wrote real mastery data — this milestone is what was always meant to fix that, not a new idea introduced now.

---

## Scope Decisions (agreed before implementation)

**1. Learner Profile persistence covers only what `LearnerState` already models** — `masteryByConcept`, `weakConceptIds`/`strongConceptIds`, `confidence`, `grade`, `learningGoals`, `preferredLearningStyle`. `12_Learner_Profile_Model.md` describes 11 categories; the other seven (Emotional Signals, Achievement System, Learning Behaviour analytics, Learning History log, Revision Planner scheduling, multi-language/Identity fields beyond grade) have no current reader anywhere in this codebase. Building persistence for them now would be exactly the kind of ahead-of-a-consumer infrastructure M3–M7 have each avoided. Documented as open gaps, not silently dropped.

**2. Reflection + Memory run right after a successful Assessment Agent turn**, not on an invented "session end" concept. `AssessmentCompleted` is Reflection Agent's own documented consumed event (`11_Reflection_Agent.md`), and it's the only concrete trigger that already exists in this pipeline — MentorOS has no session-lifecycle mechanism (no timeout, no explicit end-session action) to hang a `SessionEnding` trigger on, and inventing one now would be guessed-at infrastructure, the same risk M5 avoided with the embedding provider.

**3. `weakConceptIds`/`strongConceptIds` are derived at read time, not stored.** `PostgresLearnerStateProvider` computes them from `learner_concept_mastery.mastery_score` against thresholds (reusing Planning Agent's existing `HIGH_MASTERY_THRESHOLD = 0.8` for "strong," adding a new `LOW_MASTERY_THRESHOLD = 0.4` for "weak") rather than maintaining separate written columns that could drift out of sync with the scores that actually justify them.

**4. Memory Agent is a pure, deterministic function — not a new Claude call.** By the time evidence reaches it, Assessment and Reflection have already done the interpretive work; merging that into the profile (a mastery running average weighted by attempt count, appending newly seen misconceptions, carrying forward a confidence estimate) is mechanical, not judgment. This avoids a third Claude call on every assessment turn and makes the merge logic exhaustively unit-testable without mocking an LLM response.

---

## Architecture Decisions

- **New per-student-owned tables**, not M5's shared-reference-data pattern: `learner_profiles` (one row per student, RLS `using (id = auth.uid())`) and `learner_concept_mastery` (one row per student-concept pair, RLS `using (student_id = auth.uid())`) — mirroring `profiles`/`conversations`'s ownership pattern from `0001_init.sql`, since this is data the student's own signed-in session writes, not shared curriculum content.
- **`mastery_score` is 0–1**, matching `LearnerState.masteryByConcept` and `HIGH_MASTERY_THRESHOLD`'s existing scale — deliberately different from Assessment Agent's 0–100 `masteryScore`. The conversion (`/ 100`) happens in exactly one place: `buildLearnerProfileEvidence()` in `memory-agent.ts`.
- **`LearnerProfileWriter` is a new interface**, mirroring `KnowledgeProvider`/`LearnerStateProvider`'s storage-agnostic pattern — Memory Agent depends only on the interface; `createPostgresLearnerProfileWriter()` is its first (and, per `12_Memory_Agent.md`, only intended) implementation, since the spec states Memory Agent is "the ONLY component responsible for updating the learner profile."
- **Merge strategy for mastery**: a running average weighted by prior attempt count — `(previousMastery * previousAttempts + newEvidence) / newAttempts` — not a blind overwrite, per the spec's Update Strategy ("merge new evidence, preserve historical trends"). A deliberately simple first merge function; not recency-weighted or spaced-repetition-aware.
- **Reflection Report is never shown to the student.** It stays internal, logged as an event and passed to Memory Agent — there's no "session end" surface to show a "Today's Learning Summary" on yet (per Scope Decision 2), so this milestone doesn't introduce new visible UX ahead of a real place to put it.
- **Memory Agent still applies evidence even if Reflection Agent fails.** `MemoryAgentContext.reflectionReport` is nullable; `buildLearnerProfileEvidence()` falls back to Assessment's own misconceptions/mastery score alone when Reflection didn't produce a report — real Assessment evidence is never discarded just because the richer synthesis step failed.
- **The whole Reflection + Memory block is wrapped in one try/catch** (`memory_update_failed` on any exception) — a failure here never affects `replyContent`, which is already decided (the Assessment feedback) before this block runs.

---

## Files Created

- `web/supabase/migrations/0004_learner_profile.sql` — `learner_profiles`, `learner_concept_mastery`, both RLS-enabled with the per-student-ownership pattern.
- `web/supabase/rollbacks/0004_learner_profile.down.sql` — reversal script, same convention as `0002`'s.
- `web/src/lib/learner/postgres-learner-state-provider.ts` — `createPostgresLearnerStateProvider(supabase)`; `LOW_MASTERY_THRESHOLD`.
- `web/src/lib/learner/learner-profile-writer.ts` — `LearnerProfileWriter` interface, `LearnerProfileEvidence` type.
- `web/src/lib/learner/postgres-learner-profile-writer.ts` — `createPostgresLearnerProfileWriter(supabase)`.
- `web/src/lib/agents/reflection-agent.ts` — `ReflectionAgentContext`, `ReflectionReport`, `LearningStatus` types; `reflectOnSession()`; `buildReflectionAgentSystemPrompt()`.
- `web/src/lib/agents/memory-agent.ts` — `MemoryAgentContext` type; `buildLearnerProfileEvidence()` (pure); `updateLearnerProfile()`.

## Files Modified

- `web/src/lib/llm/client.ts` — added `ReflectionReportSchema`/`generateReflection()`.
- `web/src/app/api/chat/route.ts` — composition root now constructs `PostgresLearnerStateProvider`/`PostgresLearnerProfileWriter`; `buildPlanningContext()` now receives the real provider instead of `unknownLearnerStateProvider`; after a successful Assessment Agent turn, Reflection + Memory run and their results are logged, without changing `replyContent`.

## Files Deleted

- `web/src/lib/learner/unknown-learner-state-provider.ts` — fully superseded, same precedent as M5's deletion of `static-curriculum-provider.ts` once a real implementation existed.

---

## Database Changes

Second schema migration since M5 (first per-student-owned tables added since M0-03). Two new tables, both RLS-enabled, no changes to any existing table. Four new event names (`reflection_completed`, `reflection_failed`, `learner_profile_updated`, `memory_update_failed`), additive only.

---

## API Changes

None externally. Internally, a successful Assessment turn now also triggers two additional internal steps (Reflection, Memory) that don't change the response shape or `replyContent`.

---

## Testing Performed

- **10 unit assertions against `memory-agent.ts`** (pure functions, no mocks needed for the logic itself): `buildLearnerProfileEvidence` correctly converts Assessment's 0–100 score to LearnerState's 0–1 scale, merges and de-duplicates misconceptions from both Assessment and Reflection, returns `null` when no concept resolved (nothing to persist against), and carries Reflection's confidence through when available; `updateLearnerProfile` calls the injected writer with the built evidence and correctly no-ops (never calling the writer) when there's no concept.
- **13 unit assertions against `reflection-agent.ts`** (mocked): `reflectOnSession` passes context through and fails open; `buildReflectionAgentSystemPrompt` includes the concept, prior recorded mastery, prior weak concepts, the Assessment Report's score/status/misconception/recommended step, all six output field names, all five learning-status categories, and degrades gracefully with no prior mastery data or no resolved concept.
- **11 unit assertions against `postgres-learner-state-provider.ts`** (mocked Supabase client): `isKnown` correctly becomes `true` the moment either a profile row or any mastery row exists, and stays `false` when neither does; `masteryByConcept` correctly converts the DB's numeric-as-string values to real numbers; `weakConceptIds`/`strongConceptIds` are derived correctly at the exact threshold boundaries, with a middle-mastery concept correctly appearing in neither list; profile fields (grade/confidence/preferredLearningStyle/learningGoals) map correctly.
- **8 unit assertions against `postgres-learner-profile-writer.ts`** (mocked): a first-ever attempt sets `mastery_score` to the evidence value as-is with `attempts: 1`; a second attempt produces the exact expected running average (`(0.6×2 + 0.9)/3 = 0.7`) and increments `attempts` correctly; `common_mistakes` merges without duplicating an already-recorded mistake; `learner_profiles` is only upserted when `confidence` is actually provided, never touched otherwise.
- Re-ran the full existing suite — M5 (16), M6 (13), M7 (35), safety regression (24) — all 88 still passing, confirming this milestone's `route.ts` and `learner-state-provider.ts` swap didn't disturb prior wiring.
- `npm run build` — clean, zero TypeScript errors. `npx eslint src/` — one pre-existing error in `src/lib/supabase/proxy.ts` (confirmed via `git log`/`git status` to predate this milestone and be untouched by it — not introduced here).
- Dev server smoke test — unauthenticated `/api/chat` still returns `401`.
- No `TODO`/`FIXME`/`XXX` markers found in `web/src`.
- **Not yet verified live** — same authentication constraint noted throughout M5–M7. This is the first milestone since M3 where a live authenticated test would actually be able to observe a downstream effect (M6's Concept Agent, M4's High Mastery/Young Learner branches) that's been dormant until now — worth prioritizing a live pass here once credentials are available.

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| Real, Postgres-backed `LearnerStateProvider` replaces `unknownLearnerStateProvider` | ✅ Met |
| Memory Agent is the only write path to the learner profile | ✅ Met — `LearnerProfileWriter` has exactly one implementation, exactly one caller |
| Reflection Agent synthesizes Assessment evidence into a structured, non-shown-to-student report | ✅ Met |
| Mastery merges (doesn't overwrite) across attempts | ✅ Met, verified via exact running-average assertion |
| `weakConceptIds`/`strongConceptIds` can never drift from the scores that justify them | ✅ Met — derived at read time, not stored |
| No new data-access abstraction beyond what's needed | ✅ Met — reused `HIGH_MASTERY_THRESHOLD`, `PlanningContext.learnerState`, existing history |
| Failure of Reflection or Memory never affects the reply already sent | ✅ Met |
| Clean build | ✅ Met |

---

## Lessons Learned

- This is the first milestone where "gate an agent on real learner state" stops being purely theoretical — worth re-reading M4's and M6's own Open Issues sections now that the thing they were waiting on exists, rather than assuming they're still accurately describing the current state.
- Deriving `weakConceptIds`/`strongConceptIds` at read time instead of storing them separately was a small decision with an outsized payoff: it makes an entire class of "these two lists disagree with the mastery scores" bug structurally impossible, at the cost of one extra `.filter()` per read.
- Recognizing that Memory Agent's actual job (by the time it runs) is mechanical merging, not judgment, avoided a third Claude call per assessment turn — worth asking "has the interpretation already happened upstream?" before assuming every agent in a spec needs its own generative call.

---

## Open Issues

1. **Not yet exercised live** — same authentication constraint as M5–M7. This is now the highest-value milestone to verify live, since it's the first one where a real signed-in student's repeated interactions would visibly change downstream behavior (Concept Agent's explanation style, Personalization's profile).
2. **The full 11-category Learner Profile Model remains unimplemented** beyond what `LearnerState` already models — emotional signals, achievement system, learning-behaviour analytics, learning history log, and revision scheduling are all real, spec'd categories with no current reader or writer. Revisit once an agent actually needs one of them.
3. **The mastery merge function is a simple running average**, not recency-weighted or spaced-repetition-aware — the spec's own Revision Planner section flags spaced repetition as a future enhancement; the same reasoning applies to how mastery itself decays or weights recent evidence more heavily.
4. **`ReflectionAgentContext`'s "Practice Summary"/"Learning Session Summary" inputs are represented as raw conversation history**, same simplification every agent since M6 has made — no structured session summary is persisted anywhere.
5. **No revision scheduling exists** — `12_Learner_Profile_Model.md`'s Revision Planner (concepts due, suggested revision date) has no implementation; nothing currently prompts a student to revisit a weak concept proactively.

---

## Next Task

M8 gate review, mirroring M0–M7's milestone closure process. Given Open Issue 1, prioritize a live authenticated verification pass before closing — this milestone is the first one where doing so would actually be informative rather than confirming an already-known dormant state.
