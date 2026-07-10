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

Real retrieval of curriculum content, examples, and definitions from the vector database named in [06_Technical_Architecture.md](06_Technical_Architecture.md), replacing any knowledge implicitly hardcoded in earlier milestones. Depends on Planning (M3), Personalization (M4), Router (M2), and Context (M1) — the last agent in the Understanding→Planning chain before real teaching content enters the picture.

---

## M6 — Concept Agent (full spec)

The full, spec-compliant Concept Agent — structured Connect→Explain→Illustrate→Example→Check→Clarify→Summarize→Transition teaching framework — superseding M1's minimal placeholder-replacement response now that all four of its documented dependencies (Knowledge Retrieval, Planning, Personalization, Context) actually exist.

---

## M7 — Practice Agent + Assessment Agent

Practice question generation (depends on Concept Agent, M6) and answer evaluation (depends directly on Practice Agent). Bundled into one milestone since Assessment cannot be meaningfully tested without Practice already existing.

> **Reminder set at the user's request (2026-07-10):** when work reaches M7, revisit whether this reconstructed roadmap's milestone boundaries — especially M9's bundling — still hold, since they were a best-effort reconstruction rather than recovered original content.

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
