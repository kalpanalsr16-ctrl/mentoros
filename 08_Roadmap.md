# MentorOS Engineering Roadmap (M0–M9)

**Status:** ✅ **CLOSED — 2026-07-13.** M0 through M9 is the entire scope this roadmap ever defined. There is no M10: no spec, no dependency entry, no product-owner decision anywhere in this repository names a tenth milestone. Development against this roadmap is formally closed as of tag `v1.0.0-foundation`; see the **Development Closure** section at the end of this file for the full closing statement. Any further work is a new, separately-scoped initiative, not a continuation of M0–M9.

**Reconstruction history:** Reconstructed 2026-07-10 during the M0 gate review. This file was found empty (0 bytes) on disk at that point, despite being named as the source of truth for milestone sequencing in `CLAUDE.md`. Milestone boundaries below are grounded in the actual "Dependencies" section of every file in [05_Agent_Architecture/](05_Agent_Architecture/), not recovered verbatim text — see the Reconstruction note further down.

---

## Principle

Each milestone results in a working system. No milestone builds an agent before its documented dependencies exist, except where a deliberate product reason overrides pure buildability (see M9).

---

## M0 — Foundation

**Status:** ✅ Complete (see [docs/milestones/M0_Completion.md](docs/milestones/M0_Completion.md))

Next.js + Supabase application shell: authentication, RLS-scoped schema (`profiles`, `conversations`, `messages`, `events`), a persisted chat loop with a deliberately honest placeholder reply, a deterministic baseline safety filter, Sentry error monitoring, and a genuinely separate staging deployment. No AI agent exists yet — this milestone proves the platform the agents will run on.

---

## M1 — Context Agent

The first real AI agent. Replaces M0's placeholder reply with a genuine, context-aware LLM-generated response. Chosen first because Context Agent is the only agent in the catalog with **zero agent dependencies** — every other agent depends on it, directly or transitively.

Does not yet include intent routing, retrieval, planning, or personalization — a single general-purpose teaching response, grounded in conversation history, replaces the placeholder.

---

## M2 — Router Agent

Intent classification: distinguishes "explain this," "give me practice," "test me," "I don't get it," etc. Depends only on Context Agent (M1). Where Router detects an intent nothing downstream can fulfill yet (practice, assessment), it should fall back to M1's general response rather than fail — those capabilities arrive in M7.

---

## M3 — Planning Agent

Learning plan / teaching strategy selection, reading the Learner Profile and Learning State established in M0's schema. Depends on Router Agent (M2). Requires the Curriculum Foundation's model ([09_Curriculum_Foundation.md](09_Curriculum_Foundation.md), added after M2) to be actually implemented as Postgres tables and populated with real content (NCERT Class 3 Mathematics as the first dataset) before this milestone can start — the model now exists, but its Postgres migration and content population are still open work, not assumed done.

---

## M4 — Personalization Agent

Grade/reading-level/pace/style-aware adaptation of the Planning Agent's output. Depends on Planning Agent (M3).

---

## M5 — Knowledge Retrieval Agent

Real retrieval of curriculum content, replacing M3's static in-code dataset. Depends on Planning (M3), Personalization (M4), Router (M2), and Context (M1).

Split into two phases once the actual scale was assessed: **M5A** migrated the Curriculum Foundation model ([09_Curriculum_Foundation.md](09_Curriculum_Foundation.md)) into real Postgres tables (`PostgresKnowledgeProvider`), replacing M3's static dataset with no interface change. **M5B** introduced a separate `ConceptSearchProvider` abstraction and improved topic resolution using Postgres trigram search (`TrigramConceptSearchProvider`) — a real improvement over M3's exact-name matching, but deliberately *not* the vector/embedding-based semantic retrieval this entry originally envisioned. That decision was revisited: introducing an embedding provider wasn't justified by MentorOS's current curriculum scale (one chapter), and `06_Technical_Architecture.md` never actually specified which embedding model would back it. Both gaps are logged as real, open items — not silently resolved — revisit once curriculum scale (more subjects/grades/chapters) makes trigram search's limits a real, felt problem rather than a theoretical one.

---

## M6 — Concept Agent (v1, single-turn)

Superseded M1's free-text, guidance-string teaching reply with a real Concept Agent: a structured, single-turn teaching response (`concept`/`explanation`/`example`/`nextStep`/`confidence`) running the Connect→Explain→Illustrate→Example→Check Understanding framework within one Claude call, built from Knowledge Retrieval (M5), Planning (M3), Personalization (M4), and Context (M1).

Not the full spec: the multi-turn adaptive retry loop, the Learning State write, and true cross-turn Understanding Checks are deliberately deferred — no signal exists anywhere in the pipeline yet for "the learner is still confused by the previous explanation" (Router classifies intent categories, not confusion), and nothing downstream reads session-lesson-progress since Practice Agent (M7) doesn't exist. Revisit once M7/M8 exist to inform those gaps honestly rather than guessed at. Additionally, Concept Agent is gated on `plan.strategy !== "Diagnostic"` per Planning's own Recovery Strategy — since every real learner currently reports `isKnown: false` (carried from M3/M4, no writer until M7/M8), this branch is fully implemented and tested but does not yet fire live in production.

---

## M7 — Practice Agent + Assessment Agent

Practice question generation and answer evaluation, gated for the first time on Router Agent's (M2) `primaryIntent` classification (`Practice`/`Assessment`) rather than always falling through the same Concept-Agent-or-fallback path regardless of what the student asked for — a gap that had existed, unnoticed, since M2 introduced intent classification without anything downstream acting on it.

Deliberately gated on Router's intent alone, not Planning's Diagnostic-vs-not strategy (the gate M6's Concept Agent uses) — Planning's Diagnostic judgment is about how to *explain* a concept, not whether to honor an explicit practice request or answer submission. As a result, unlike M6, Practice and Assessment Agents fire live today rather than waiting on M8's learner-state writer.

No new persisted state (Learning State practice progress, Assessment State, cross-session mastery) — deferred until Memory Agent (M8) exists to own it, same reasoning M3/M4/M6 already established.

> **Reconstructed-roadmap reminder (set 2026-07-10) — resolved 2026-07-11.** At the start of M7, the product owner was asked whether this reconstructed roadmap's milestone boundaries — especially M9's bundling — still held. Confirmed as-is, no changes.

---

## M8 — Reflection Agent + Memory Agent

Reflection Agent synthesizes an Assessment Report into a structured (internal, not shown to the student) Learning Reflection Report; Memory Agent merges that evidence into a real, Postgres-backed Learner Profile — the first real implementation of `LearnerStateProvider`, replacing `unknownLearnerStateProvider`. This is the milestone that finally lets `LearnerState.isKnown` become `true`, unblocking branches M4 (High Mastery/Young Learner personalization) and M6 (Concept Agent) have carried as "tested but dormant" since they were built.

Scoped to only the Learner Profile fields `LearnerState` already models (mastery, weak/strong concepts, confidence, grade, goals, style) — the full 11-category model in `12_Learner_Profile_Model.md` (emotional signals, achievement system, learning-behaviour analytics, revision scheduling) has no current reader and remains a documented, deferred gap. Reflection + Memory run right after a successful Assessment turn (`AssessmentCompleted`, Reflection's own documented trigger), not on an invented "session end" concept, since MentorOS has no session-lifecycle mechanism to hang one on. Memory Agent is a pure, deterministic merge function, not a new Claude call — by the time it runs, Assessment and Reflection have already done the interpretive work.

Bundled for the same reason as M7: Memory cannot be meaningfully tested without Reflection's output to merge.

---

## M9 — Safety Agent (full) + Evaluation Agent + Observability Agent + Voice Agent

Split in practice once M8 was built and each component was checked against its own spec's Dependencies section (2026-07-12):

- **Safety Agent (full)** — was blocked on a Policy Engine document that didn't exist; drafted [11_Policy_Engine.md](11_Policy_Engine.md) and reviewed with the product owner. Now in active scope for M9. Key decisions: Safety Agent runs **before** Router Agent (the first agent to touch any message; `03_Safety_Agent.md` updated to match), and enforces exactly two outcomes — **Allow** or **Block** — with the originally-described "constrain the response" (Medium-risk) behavior explicitly deferred, since the routing/prompt-transformation plumbing it needs doesn't exist yet.
- **Evaluation Agent** — was blocked on an Evaluation Framework document that was empty on disk; drafted [07_Evaluation_Framework.md](07_Evaluation_Framework.md) and reviewed with the product owner. Now in active scope for M9. Key decision: Safety **overrides** every other quality dimension in `overall_score` (a gate/ceiling, not just a weight) — MentorOS is a child-focused educational platform, and a safety failure cannot be averaged away by an otherwise-excellent response.
- **Observability Agent** — depended on Evaluation Agent existing (per its own Dependencies section); implemented 2026-07-12 immediately after M9-01 as a separate pass. Scoped down to a single read-only aggregation function (`getObservabilityReport`) reconstructing the spec's Observability Report from the existing `events` table — dashboards, real-time anomaly detection, and infrastructure metrics (cache/queue/infra health) all need infrastructure this codebase doesn't have and remain unimplemented. See [M9-02](docs/implementation/M9-02-Observability-Agent.md). `10_Observability.md` remains unwritten, confirmed as a later task, not a blocker.
- **Voice Agent** — no spec file exists; product owner confirmed (2026-07-12) to keep it deferred indefinitely, not designed or implemented as part of M9.

M9's active scope is now Safety Agent (full) + Evaluation Agent. Observability Agent is a natural fast-follow once Evaluation Agent exists, not bundled into the same implementation pass. Voice Agent is out of scope with no target milestone.

**Implemented 2026-07-12** — see [M9-01](docs/implementation/M9-01-Safety-Evaluation-Agents.md). Safety Agent is a two-layer gate (M0's keyword filter, then a new Claude call for the remaining applicable categories) running before Router Agent; enforces Allow/Block only, fails closed (not open) on its own failure -- the one deliberate exception to this codebase's fail-open convention. Evaluation Agent scores every Concept/Practice/Assessment interaction internally (never shown to the student), with Safety implemented as a hard ceiling on `overallScore` and `efficiency`/`overallScore`/`qualityStatus`/`hallucinationRisk` all computed deterministically rather than asked of the model.

---

## Known gaps this roadmap surfaced

- ~~`07_Evaluation_Framework.md` — empty; needed before M9's Evaluation Agent can be scoped.~~ Drafted and reviewed 2026-07-12 ([07_Evaluation_Framework.md](07_Evaluation_Framework.md)) — Safety-overrides-everything decision incorporated; one open question remains (Teaching Effectiveness's retroactive scoring; Diagnostic-turn Groundedness exclusion).
- `10_Observability.md` — still empty; platform-wide observability strategy, distinct from the Observability Agent spec. Product owner confirmed (2026-07-12) this is a later task, not a blocker for M9.
- ~~No Curriculum Graph document~~ — resolved: [09_Curriculum_Foundation.md](09_Curriculum_Foundation.md) defines the model. Still open before M3 can start: its Postgres migration and real content population (NCERT Class 3 Mathematics as the first dataset).
- ~~No Policy Engine document — needed before M9's Safety Agent.~~ Drafted and reviewed 2026-07-12 ([11_Policy_Engine.md](11_Policy_Engine.md)) — pipeline ordering (Safety before Router) and enforcement scope (Allow/Block only, constrained responses deferred) both decided; one open question remains (age-band granularity).
- No Voice Agent spec file — needed before M9's Voice Agent work. Product owner confirmed (2026-07-12): stays deferred indefinitely, not designed or implemented.

## Reconstruction note

This file was rebuilt during the M0 gate review after being found empty. M0's scope and M9's "Safety Agent last" placement are recalled directly from the original planning conversation; every other milestone boundary (M1–M8) was derived from the dependency graph in `05_Agent_Architecture/`, not recovered from the original text. Reviewed and accepted as-is by the product owner on 2026-07-10, with an explicit flag to revisit at M7.

---

## Development Closure — 2026-07-13

**There is no M10.** Checked directly, not assumed: [05_Agent_Architecture/](05_Agent_Architecture/) contains 13 numbered agent specs (`02` through `14`), every one of which is either implemented (Context, Router, Planning, Personalization, Knowledge Retrieval, Concept, Practice, Assessment, Reflection, Memory, Safety, Evaluation, Observability) or explicitly, deliberately deferred with no spec file at all (Voice Agent). No document in this repository — this roadmap, any agent spec, any implementation doc — names or implies a tenth milestone. M9 was always this roadmap's last entry.

**Final status of every milestone:**

| Milestone | Status |
|---|---|
| M0 — Foundation | ✅ Complete |
| M1 — Context Agent | ✅ Complete |
| M2 — Router Agent | ✅ Complete |
| M3 — Planning Agent | ✅ Complete |
| M4 — Personalization Agent | ✅ Complete |
| M5 — Knowledge Retrieval Agent | ✅ Complete |
| M6 — Concept Agent (v1) | ✅ Complete |
| M7 — Practice + Assessment Agents | ✅ Complete |
| M8 — Reflection + Memory Agents | ✅ Complete |
| M9 — Safety + Evaluation + Observability Agents | ✅ Complete |

**Closing verification:** the [M0–M9 Production Verification Sweep](docs/implementation/M0-M9-Production-Verification-Sweep.md) confirmed every milestone live against the real staging environment (build, lint, 176-assertion regression suite, RLS/pipeline code audit, and a full authenticated end-to-end pass through the real chat pipeline). The [Token-Logging Housekeeping Pass](docs/implementation/Token-Logging-Housekeeping.md) closed the last known observability gap. Tagged `v1.0.0-foundation`; see [CHANGELOG.md](CHANGELOG.md) for the milestone-by-milestone summary.

**Deliberately out of scope, not oversights** — carried forward as open items for whatever initiative picks them up next, not silently dropped:

- **Voice Agent** — no spec file; product owner confirmed indefinitely deferred (M9 decision, 2026-07-12).
- **Constrained Responses** (graduated Medium-risk action) — Safety Agent enforces Allow/Block only; the routing/prompt-transformation plumbing this needs doesn't exist.
- **Semantic/embedding-based concept retrieval** — M5 shipped trigram search as the interim; revisit once curriculum scale makes its limits a felt problem.
- **Full 11-category Learner Profile Model** ([12_Learner_Profile_Model.md](12_Learner_Profile_Model.md)) — M8 only implements the mastery/confidence/grade/goals/style subset `LearnerState` already models.
- **`10_Observability.md`** — platform-wide observability strategy, distinct from the Observability Agent spec; still a 0-byte file. Confirmed a later task, not a blocker, throughout M9.
- **Age-band granularity** in the Policy Engine's Child Safety category — one open question in [11_Policy_Engine.md](11_Policy_Engine.md).
- **Teaching Effectiveness's retroactive scoring / Diagnostic-turn Groundedness exclusion** — one open question in [07_Evaluation_Framework.md](07_Evaluation_Framework.md).
- **The `messages` table RLS gap** found during the Production Verification Sweep — INSERT policy checks conversation ownership only, not `role`, so a student's own client could in principle insert a fabricated `assistant`-role row. Low blast radius (self-only), flagged as a recommendation, not fixed as part of this roadmap's scope.

**What this means going forward:** this roadmap is closed, not paused. Any future milestone is a new initiative requiring its own scoping, documentation, and product-owner decisions — per `CLAUDE.md`'s standing rule, nothing beyond this point should be built by inferring intent from what came before.
