# MentorOS Engineering Roadmap (M0–M9)

**Status:** Reconstructed 2026-07-10 during the M0 gate review. This file was found empty (0 bytes) on disk at that point, despite being named as the source of truth for milestone sequencing in `CLAUDE.md`. Milestone boundaries below are grounded in the actual "Dependencies" section of every file in [05_Agent_Architecture/](05_Agent_Architecture/), not recovered verbatim text — see the note at the end of this file.

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

Post-session reflection (depends on Assessment + Practice, M7) and long-term learner memory (depends directly on Reflection). Bundled for the same reason as M7.

---

## M9 — Safety Agent (full) + Evaluation Agent + Observability Agent + Voice Agent

- **Safety Agent (full)** — the complete AI-driven safety layer (prompt-injection defense, academic integrity, age-appropriateness, risk escalation), superseding M0's deterministic baseline filter. Deliberately last: it is technically buildable as early as M2 (only depends on Context + Router + a Policy Engine that doesn't exist yet), but is intentionally deferred until real usage patterns exist to design it against rather than guessing.
- **Evaluation Agent** — depends on Knowledge Retrieval, Concept, Assessment, Reflection all existing (M5–M8), plus an Evaluation Framework document that is also currently empty on disk (`07_Evaluation_Framework.md`) and needs to be written before this agent can be scoped.
- **Observability Agent** — depends on every other agent existing, by definition last.
- **Voice Agent** — no spec file currently exists in `05_Agent_Architecture/` at all (only referenced in the catalog and architecture diagram); placed last as the interaction-layer capability least coupled to the teaching pipeline's correctness.

This is the most heavily bundled milestone in this roadmap and the one most likely to need splitting once M7/M8 are actually built — see the M7 reminder above.

---

## Known gaps this roadmap surfaced

- `07_Evaluation_Framework.md` — empty; needed before M9's Evaluation Agent can be scoped.
- `10_Observability.md` — empty; platform-wide observability strategy, distinct from the Observability Agent spec.
- ~~No Curriculum Graph document~~ — resolved: [09_Curriculum_Foundation.md](09_Curriculum_Foundation.md) defines the model. Still open before M3 can start: its Postgres migration and real content population (NCERT Class 3 Mathematics as the first dataset).
- No Policy Engine document — needed before M9's Safety Agent.
- No Voice Agent spec file — needed before M9's Voice Agent work.

## Reconstruction note

This file was rebuilt during the M0 gate review after being found empty. M0's scope and M9's "Safety Agent last" placement are recalled directly from the original planning conversation; every other milestone boundary (M1–M8) was derived from the dependency graph in `05_Agent_Architecture/`, not recovered from the original text. Reviewed and accepted as-is by the product owner on 2026-07-10, with an explicit flag to revisit at M7.
