# M3-01 — Planning Agent

**Status:** ✅ Completed
**Date:** 2026-07-11

**Note on scope:** this single document covers the entire Planning Agent milestone — the `KnowledgeProvider` and `LearnerStateProvider` abstractions, the NCERT dataset, `PlanningContext`, and `/api/chat` wiring — since the full architecture (both provider abstractions, the static-first-implementation strategy, and the `PlanningContext` aggregation contract) was agreed with the product owner across several rounds of revision before any code was written.

---

## Objective

Add the Planning Agent (`05_Agent_Architecture/05_Planning_agent.md`): select a teaching strategy for each safe, routed message by reading curriculum knowledge and learner state through storage-agnostic abstractions, and make that strategy observably influence M1's existing reply — without coupling Planning Agent to Postgres, a specific dataset, or any concrete persistence mechanism.

---

## Why This Task Exists

M2 gave MentorOS intent classification but no sense of *how* to teach based on who's asking. Planning Agent is next per `08_Roadmap.md`, but its own spec names five dependencies — Router (done), Learner Profile, Curriculum Graph, Learning State, Session State — and only Router and a thin slice of Session State had any real implementation before this task. `09_Curriculum_Foundation.md` defined the curriculum *model* on paper; this task is where a real (if intentionally narrow) implementation of that model, and of learner state, actually gets built.

---

## Requirements

- Planning Agent depends only on interfaces for curriculum knowledge and learner state — never a database, a specific dataset, or a specific persistence mechanism directly.
- The first curriculum implementation is a small, structured, real dataset (one NCERT chapter), not a Postgres migration — deferred to M5 per explicit product-owner direction, avoiding premature infrastructure investment ahead of real usage patterns.
- The first learner-state implementation always reports "unknown" — correct, not a stub to apologize for, since no agent (Assessment/Memory, M7/M8) exists yet to have written real mastery data.
- Planning Agent consumes a single aggregated `PlanningContext`, not separate calls for intent/learner-state/curriculum data.
- The computed Learning Plan must have a real, observable effect on the student-facing reply this milestone (not log-only), without requiring the full Concept Agent (M6).
- No new database schema.

---

## Architecture Decisions

Reached across several rounds of explicit revision with the product owner before implementation — each revision rejected an initially-simpler proposal in favor of a cleaner long-term shape:

- **`KnowledgeProvider` is a storage-agnostic interface** (`lib/knowledge/knowledge-provider.ts`) — `findConceptByTopic`, `getPrerequisites`, `getLearningObjectives`, `getMisconceptions`, `getTeachingStrategies`, `getMasteryCriteria`. Planning Agent never imports a concrete implementation; the concrete choice is wired at the `/api/chat` composition root. This directly enables M5's real Postgres/pgvector-backed Knowledge Retrieval Agent to replace today's implementation without touching Planning Agent's code.
- **`StaticCurriculumProvider` is generic over its dataset** (`lib/knowledge/static-curriculum-provider.ts`) — the engine file never mentions NCERT, a grade, or a subject; that specificity lives entirely in the dataset passed in (`lib/knowledge/datasets/ncert-class3-math-addition-subtraction.ts`), which also carries its own `board`/`grade`/`subject`/`chapter` metadata. A second dataset (a different chapter, subject, or board) plugs into the same engine unchanged.
- **The first real dataset is one representative NCERT Class 3 Mathematics chapter** ("Give and Take" — addition and subtraction with regrouping), not the full syllabus — authored as pedagogically sound, standard elementary-math content in NCERT's style, explicitly flagged as an approximation for curriculum-author review before being trusted as authoritative at scale (the same honesty standard M0-08's safety filter held itself to).
- **`LearnerStateProvider` gets the identical treatment** (`lib/learner/learner-state-provider.ts`) — Planning Agent never reads `profiles` or any table directly, even though `profiles.grade` already exists from M0. The first implementation, `unknownLearnerStateProvider`, always reports `{ isKnown: false }`. This was the product owner's explicit extension of the same principle applied to Curriculum: building persistence for mastery/weak-concepts/confidence now, with no writer until M7/M8, would be the identical premature-coupling smell.
- **`PlanningContext` is the standard aggregated input contract** (`lib/agents/planning-context.ts`) — `intent`, `learnerState`, `concept`, `learningObjectives`, `misconceptions`, `teachingStrategies` bundled into one object by `buildPlanningContext()`, rather than Planning Agent pulling each piece separately. Explicitly named by the product owner as the shape future Planning-adjacent work (Memory, Retrieval, Analytics) should also build against.
- **`decidePlan()` is a pure function** — no I/O, takes a `PlanningContext`, returns a `LearningPlan`. This let every branch of the spec's Decision Tree be unit-tested directly with hand-built contexts, without needing to mock providers for the decision logic itself (only `buildPlanningContext()`'s assembly step needs provider mocks).
- **Option (b) chosen for making Planning observable**: the computed plan is translated into a short natural-language instruction (`describeLearningPlanForPrompt()`) appended to M1's existing system prompt in `generateTeachingReply()`, rather than left as a logged-only artifact. `generateTeachingReply()` gained one new optional parameter; its core (system prompt + history) is otherwise unchanged from M1.
- **Planning fails open** — any error during context assembly or decision logic logs `planning_failed` and falls through to an unguided M1 reply, the same resilience contract Router Agent established in M2.
- **`HIGH_MASTERY_THRESHOLD` (0.8) is a named, exported constant**, not inlined — tunable once real mastery data exists (M8).

---

## Files Created

- `web/src/lib/knowledge/curriculum-types.ts` — `Concept`, `ConceptRelationship`, `LearningObjective`, `Misconception`, `TeachingStrategy`, `MasteryCriteria` (TypeScript mirror of `09_Curriculum_Foundation.md`'s Part A/B).
- `web/src/lib/knowledge/knowledge-provider.ts` — the `KnowledgeProvider` interface.
- `web/src/lib/knowledge/static-curriculum-provider.ts` — `createStaticCurriculumProvider(dataset)`, generic engine.
- `web/src/lib/knowledge/datasets/ncert-class3-math-addition-subtraction.ts` — the first real dataset.
- `web/src/lib/learner/learner-state.ts` — `LearnerState` type.
- `web/src/lib/learner/learner-state-provider.ts` — the `LearnerStateProvider` interface.
- `web/src/lib/learner/unknown-learner-state-provider.ts` — `unknownLearnerStateProvider`, first implementation.
- `web/src/lib/agents/planning-context.ts` — `PlanningContext` type.
- `web/src/lib/agents/planning-agent.ts` — `HIGH_MASTERY_THRESHOLD`, `LearningPlan`, `buildPlanningContext()`, `decidePlan()`, `describeLearningPlanForPrompt()`.

## Files Modified

- `web/src/lib/llm/client.ts` — `generateTeachingReply()` gained an optional `planGuidance` parameter, appended to the system prompt when present.
- `web/src/app/api/chat/route.ts` — wires Planning Agent in after a successful, non-clarification Router result: builds the `PlanningContext` (using module-scope `unknownLearnerStateProvider` and a `StaticCurriculumProvider` instantiated with the NCERT dataset — the one place in the codebase that names a concrete dataset), decides a plan, logs `learning_plan_created`/`planning_failed`, and passes the resulting guidance into `generateTeachingReply()`.

---

## Database Changes

None. Per explicit product-owner direction, no Postgres migration for curriculum or learner-state data this milestone — both are served by in-code, storage-agnostic providers. One new `events` payload shape (`learning_plan_created`, `planning_failed`) — additive, same pattern as M1/M2.

---

## API Changes

- `POST /api/chat` — a safe, routed, non-clarification message may now receive a reply whose tone/pace/depth reflects a computed teaching strategy (most often `Diagnostic`, since every real learner is currently `isKnown: false`). Response shape unchanged.

---

## UI Changes

None — a plan-guided reply renders as a normal assistant message.

---

## Testing Performed

- **`StaticCurriculumProvider` (16 assertions) against the real NCERT dataset**, not mocked: exact/case-insensitive name matching, subtopic-over-topic precedence, no-match returning `null`, prerequisite resolution correctly excluding `builds_on` edges, the multi-concept integrative learning objective resolving via *either* of its two concepts, misconceptions/teaching-strategies/mastery-criteria lookups, and empty-array behavior for unknown IDs.
- **`decidePlan()` (10 assertions)**, pure function, hand-built `PlanningContext` objects: unknown learner → Diagnostic; known learner with no concept resolved → Diagnostic; known learner with no mastery entry → ConceptFirst; high mastery (including exactly at the 0.8 threshold) → PracticeFirst with no follow-up required; partial mastery → GuidedDiscovery; a concept flagged weak overriding otherwise-high mastery → Revision.
- **`describeLearningPlanForPrompt()` (5 assertions)** — every strategy produces non-empty guidance text.
- **`buildPlanningContext()` (7 assertions)**, mocked providers: concept resolution via topic, learner state pass-through, concept-dependent lookups (objectives/misconceptions/strategies) correctly skipped entirely (mock throws if called) when no concept resolves.
- **Live end-to-end verification** against the real Claude API: built a real `PlanningContext` using the actual `unknownLearnerStateProvider` and the real NCERT-backed `StaticCurriculumProvider`, computed a real Diagnostic plan, and confirmed `generateTeachingReply()` produces a genuinely different, observably more diagnostic-first reply with guidance than without it for the same question ("How do I add 47 and 38?").
- **Safety regression**: the same 24-phrase M1-06 test re-verified unchanged, plus structural re-confirmation that `classifyIntent`, `buildPlanningContext`, and `generateTeachingReply` all remain inside `route.ts`'s single safe-branch `if`/`else` — Planning's insertion created no second path into any Claude call for unsafe content.
- `npm run build` — clean, zero TypeScript errors.
- Dev server smoke test — unauthenticated `/api/chat` still returns `401`.
- No `TODO`/`FIXME`/`XXX` markers found in `web/src`.

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| Planning Agent depends only on interfaces, never a database or dataset directly | ✅ Verified by code inspection — `planning-agent.ts` has zero database or dataset imports |
| First curriculum implementation is a small real dataset, not Postgres | ✅ One real NCERT chapter, in-code, verified against 16 real assertions |
| First learner-state implementation correctly reports unknown | ✅ `unknownLearnerStateProvider` verified; correctly triggers Diagnostic strategy |
| `PlanningContext` aggregates intent/learner-state/curriculum into one object | ✅ Verified via `buildPlanningContext()` tests |
| Learning Plan observably affects the reply | ✅ Verified live — a real, differently-toned reply for the same question |
| Planning fails open on error | ✅ By construction (`try`/`catch` around context assembly + decision, logs `planning_failed`) |
| Zero new Claude calls for unsafe/rate-limited messages | ✅ Re-verified structurally, same guarantee as M1-06/M2-01 |
| No new database schema | ✅ Met |
| Clean build | ✅ Met |

---

## Lessons Learned

- Applying "don't couple to a specific storage mechanism before something real needs to write to it" consistently — first to Curriculum, then by the product owner's own initiative to Learner State — caught a second instance of the same premature-infrastructure smell that a narrower review (just doing what was asked for Curriculum) would have missed entirely.
- A pure decision function (`decidePlan`) that takes a fully-assembled context is dramatically easier to test exhaustively than one that reaches out to providers itself — every branch of a five-way decision tree got direct coverage without a single mock, and the provider-assembly step (`buildPlanningContext`) only needed a much smaller, separate set of mocked-provider tests.
- Real live verification (not just unit tests) was worth the extra step here specifically because "does the guidance text actually change the model's behavior" is not something a mock or a type check can answer — only a real Claude call comparing guided vs. unguided output for the same input can.

---

## Open Issues

- **Every real learner is currently `isKnown: false`** — the Diagnostic branch of `decidePlan()` will dominate in production until Assessment/Memory Agents (M7/M8) exist to write real mastery data. This is correct spec behavior, not a bug, but means Planning can't be fully exercised end-to-end with real mastery variety until much later.
- **`StaticCurriculumProvider` only knows one chapter** — any topic outside "Addition and Subtraction" resolves to `concept: null` and a Diagnostic plan, by design, not a search failure.
- **The NCERT dataset is an authored approximation**, not verbatim textbook content — worth a real curriculum-author review before being trusted as authoritative, and before any additional chapters are added the same way.
- **`findConceptByTopic()` uses simple exact-name matching**, not real semantic search — a topic phrased differently than any concept's name (e.g. "carrying in addition" instead of "Addition with regrouping") won't resolve. Real semantic matching is explicitly M5's problem.
- Carried from M2: still two Claude calls per answerable message (classify, then reply) — Planning Agent itself adds no additional API call; `decidePlan()` and `buildPlanningContext()` are pure/local, only `classifyIntentWithClaude` and `generateTeachingReply` touch the network.
- Carried from M0/M1/M2: no client-side UX for `429`, no org-wide Claude spend cap, `07_Evaluation_Framework.md`/`10_Observability.md` still empty.

---

## Next Task

M3 gate review, mirroring M0/M1/M2's milestone closure process.
