# Milestone M3 — Completion Report

**Status:** ✅ Closed (functionally complete; not yet deployed)
**Closed:** 2026-07-11
**Tag:** `v0.4.0-m3` (local; push/deploy pending explicit decision, same as M1/M2's initial closure)
**Reviewer:** Lead Engineer gate review (this document)

---

## Objectives

M3's job was to add the Planning Agent (`05_Agent_Architecture/05_Planning_agent.md`): select a teaching strategy per message by reading curriculum knowledge and learner state, and make that strategy observably change the student-facing reply — while keeping Planning Agent independent of *how* that data is actually stored, so later milestones (M5's real Knowledge Retrieval, M8's real Memory/Assessment-backed mastery data) can each replace one implementation without any change to Planning Agent's own code.

M3 explicitly does **not** include a Postgres migration for curriculum or learner-state data, real mastery tracking, Knowledge Retrieval, Personalization, Memory, or Evaluation — those remain sequenced in later milestones per `08_Roadmap.md`.

---

## Tasks Completed

| # | Task | Commit | Doc |
|---|---|---|---|
| 1 | Planning Agent: `KnowledgeProvider`/`LearnerStateProvider` abstractions, static NCERT dataset, `PlanningContext`, `/api/chat` wiring | `5fc0457` | [M3-01](../implementation/M3-01-Planning-Agent.md) |
| — | Curriculum Foundation model (`09_Curriculum_Foundation.md`) | `d4cd6a3` | — (pre-M3 design work, held from push per persistent memory until M3 pushes) |

Like M2, M3 was a single cohesive task — the full architecture (both provider abstractions, the static-first-implementation strategy for each, and the `PlanningContext` aggregation contract) was proposed and revised with the product owner across several rounds before any code was written, so there were no natural seams to split across commits.

Working tree is clean. Both commits exist only on local `main`.

---

## Architecture Decisions

Full rationale in [M3-01](../implementation/M3-01-Planning-Agent.md); the decisions most load-bearing for later milestones:

- **`KnowledgeProvider` and `LearnerStateProvider` are both storage-agnostic interfaces** — Planning Agent imports neither a database client nor a specific dataset; both are injected at the `/api/chat` composition root. This is the same pattern Router Agent established for its `classify` parameter in M2, now applied twice more.
- **First implementations are deliberately minimal, not full persistence.** `StaticCurriculumProvider` is backed by one real, authored NCERT Class 3 Mathematics chapter (in-code, no migration); `unknownLearnerStateProvider` always reports an unknown learner (no migration either). Both decisions explicitly avoid building infrastructure — a Postgres schema, RLS policies — for data that would sit unused until a real consumer exists (M5 for curriculum retrieval at scale, M8 for real mastery writes from Assessment/Memory Agents).
- **`PlanningContext` is the standard, product-owner-named aggregation contract** — intent, learner state, and resolved curriculum knowledge bundled into one object, rather than Planning Agent pulling each piece separately. Explicitly intended to be reused by future Memory, Retrieval, and Analytics work.
- **The Learning Plan is made observable via prompt guidance, not left log-only** — `generateTeachingReply()` gained one optional parameter; its core system prompt and history handling are otherwise unchanged from M1. Live-verified to produce a genuinely different, more diagnostic-first reply for the same input.
- **Planning fails open** on any error — same resilience contract as Router Agent (M2).

---

## Database Changes

None. Two new `events` payload shapes (`learning_plan_created`, `planning_failed`) — additive only, same pattern M1/M2 used.

---

## Infrastructure

No new infrastructure. No new environment variables. Not yet deployed — Production currently runs M2's code.

---

## Security

- No new attack surface — Planning only runs after Router succeeds with a non-clarification intent, itself only reachable after the safety-filter and rate-limit gates. Structurally re-verified that `classifyIntent`, `buildPlanningContext`, and `generateTeachingReply` all remain inside the same single safe-branch `if`/`else` M0-08 established.
- The M1-06 safety regression (24 phrases) was re-run and re-verified unaffected.
- No new credentials were introduced.

---

## Observability

- Two new event types: `learning_plan_created` (strategy, difficulty, pace, follow-up flag, whether a concept was resolved) and `planning_failed` (failure reason). Both additive to the existing `events` table.

---

## Documentation

- `docs/implementation/M3-01-Planning-Agent.md` — full detail on the design, all four rounds of architectural revision, and all testing performed.
- `web/README.md` — updated to reflect `src/lib/knowledge/` and `src/lib/learner/`.
- `09_Curriculum_Foundation.md` (added just before M3) is the model this milestone's `KnowledgeProvider` types mirror — cross-referenced, not duplicated.

---

## Testing

- 16 assertions against `StaticCurriculumProvider` using the real NCERT dataset (not mocked): topic/subtopic matching, prerequisite resolution correctly excluding non-prerequisite relationship types, a multi-concept learning objective resolving via either of its concepts, misconception/teaching-strategy/mastery-criteria lookups, and correct empty-result behavior for unknown IDs.
- 10 assertions against `decidePlan()`, a pure function, covering every branch of the spec's Decision Tree with hand-built contexts — no provider mocking needed for the decision logic itself.
- 5 assertions confirming every strategy produces non-empty prompt guidance.
- 7 assertions against `buildPlanningContext()` with mocked providers, including confirming concept-dependent lookups are skipped entirely (mocks configured to throw if called) when no concept resolves.
- Live verification against the real Claude API: the same question, with and without plan guidance, produced genuinely different replies — the guided version opened with a diagnostic baseline question rather than a hint, matching the computed Diagnostic strategy.
- Safety regression (24 phrases) re-run and passing; structural re-verification of the unsafe branch.
- `npm run build` — clean, zero TypeScript errors (re-verified fresh for this report, after the README edit).
- Dev server smoke test — unauthenticated `/api/chat` still returns `401`.
- No `TODO`/`FIXME`/`XXX` markers found in `web/src`.
- `npm audit` — same 2 moderate advisories as M0/M1/M2 (pre-existing, not introduced by M3).

---

## Risks

1. **M3's code is not deployed.** Production currently runs M2's code; M3's commits are local-only pending an explicit decision, consistent with this project's established push/deploy discipline.
2. **Every real learner is currently `isKnown: false`.** The Diagnostic strategy will dominate in production until Assessment/Memory Agents (M7/M8) exist to write real mastery data — correct spec behavior, not a bug, but Planning can't be exercised against real mastery variety until much later.
3. **`StaticCurriculumProvider` only covers one chapter.** Any topic outside "Addition and Subtraction" resolves to no concept and a Diagnostic plan, by design.
4. **The NCERT dataset is an authored approximation**, not verbatim textbook content — flagged for curriculum-author review before being trusted as authoritative at scale.
5. **`findConceptByTopic()` does simple exact-name matching**, not semantic search — a real limitation until M5's actual retrieval implementation replaces it.
6. **`09_Curriculum_Foundation.md` (commit `d4cd6a3`) is held from push** per the product owner's explicit instruction (see persistent memory) until it can go with M3 — this report's push, when it happens, should include that commit too.

---

## Lessons Learned

- Applying a principle the user stated once ("don't couple Curriculum to Postgres prematurely") a second time on their own initiative (to Learner State) caught the same smell in a place a narrower interpretation of the request would have missed — worth actively looking for the second instance of a stated principle, not just satisfying the literal ask.
- Separating a pure decision function from its context-assembly step made a five-way decision tree fully testable without mocking anything — worth defaulting to this split whenever a decision depends on aggregated data from multiple sources.
- Live verification answered a question unit tests structurally cannot: whether prompt guidance actually changes model behavior, not just whether the code compiles and the plumbing is wired correctly.

---

## Technical Debt

| Item | Severity | Notes |
|---|---|---|
| M3 not deployed to Vercel | High | Same pattern as M1/M2; needs an explicit push/deploy decision |
| Every learner reports unknown | Medium | Correct until M7/M8 exist; Diagnostic strategy will dominate real usage until then |
| Curriculum dataset covers one chapter only | Medium | By design; more chapters/subjects are additive later work |
| NCERT dataset needs curriculum-author review | Medium | Authored approximation, not verbatim textbook content |
| `findConceptByTopic` is exact-match only | Medium | Real semantic search deferred to M5 |
| *(carried)* Two Claude calls per answerable message | Medium | Unchanged from M2; Planning adds no new API call |
| *(carried)* No curriculum taxonomy validation on Router's topic/subtopic | Medium | Same gap M2 surfaced; partially addressed by `findConceptByTopic`, not fully resolved |
| *(carried)* Preview/Staging behind Production | Medium | Now three milestones behind once M3 deploys |
| *(carried from M0/M1/M2)* `07_Evaluation_Framework.md`, `10_Observability.md` empty | Medium | Still empty |
| *(carried from M0/M1/M2)* Client-side Sentry capture unverified | Low | Unchanged |
| *(carried from M0/M1/M2)* No region-specific crisis hotline | Low | Deliberate, pending region confirmation |
| *(carried from M0/M1/M2)* 2 moderate `npm audit` advisories | Low | Pre-existing, not introduced by this project |

---

## Final Acceptance Checklist

| # | Check | Result |
|---|---|---|
| 1 | Every M3 acceptance criterion met | ✅ All 9 criteria in M3-01 met, verified live, by unit test, and by structural check |
| 2 | Application builds successfully | ✅ Clean `npm run build`, zero TypeScript errors (re-verified fresh) |
| 3 | Deployment healthy | ⚠️ Not applicable yet — M3 code has not been pushed or deployed |
| 4 | Supabase integration verified | ✅ Unchanged from M2; no new schema or query patterns introduced |
| 5 | Sentry integration verified | ✅ Unchanged; not independently re-exercised (no new deploy) |
| 6 | Environment variables verified | ✅ No new environment variables required for M3 |
| 7 | Documentation complete | ✅ M3-01 complete; README updated |
| 8 | README up to date | ✅ Fixed during this review (`lib/knowledge/`, `lib/learner/`) |
| 9 | All decisions documented | ✅ Captured in M3-01 and summarized above |
| 10 | No stray TODOs / incomplete work | ✅ No `TODO`/`FIXME`/`XXX` in source |

**Verdict: M3 is functionally complete and closed at the code level.** Every acceptance criterion is met and verified — live for the plan-guidance behavioral change, by unit test for the decision logic and curriculum provider, and structurally for the unchanged safety guarantee. As with M1 and M2's initial closure, deployment is the one item this report does not resolve on its own — pushing M3 (and, per standing instruction, `09_Curriculum_Foundation.md` alongside it) requires the same explicit, specific go-ahead this project has required for every prior push.
