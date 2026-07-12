# Changelog

All notable changes to MentorOS are documented in this file, milestone by milestone, per [08_Roadmap.md](08_Roadmap.md).

## [v1.0.0-foundation] — 2026-07-13

MentorOS Foundation complete: the full M0–M9 agent pipeline, live-verified end-to-end against the real staging environment, with consistent cost/token observability across every LLM call. This tag closes the original roadmap; any work beyond this point is a new, explicitly-scoped milestone.

### M0 — Foundation

Next.js + Supabase application shell. Authentication (student sign-up/sign-in), RLS-scoped schema (`profiles`, `conversations`, `messages`, `events`), a persisted chat loop with a deliberately honest placeholder reply, a deterministic baseline safety filter, trace ID + event logging, Sentry error monitoring, and genuinely separate staging/production deployments on Vercel.

### M1 — Context Agent

The first real AI agent. Replaced M0's placeholder reply with a genuine, conversation-history-aware LLM-generated response via the Anthropic Claude API. Added per-student rate limiting and a safety-filter regression test against the now-LLM-wired chat path.

### M2 — Router Agent

Intent classification, separate from teaching content: distinguishes explanation requests, practice requests, assessment requests, and platform questions, with a clarification path for ambiguous messages.

### M3 — Planning Agent

Learning plan / teaching strategy selection, reading the Learner Profile and Learning State. Introduced the Curriculum Foundation model (storage-agnostic curriculum and learner-state provider interfaces) that M5 later backed with real Postgres tables.

### M4 — Personalization Agent

Grade/reading-level/pace/style-aware adaptation of the Planning Agent's output — teaching style, difficulty, pace, example style, encouragement, and hint level tuned per learner.

### M5 — Knowledge Retrieval Agent

Real retrieval of curriculum content, replacing M3's static in-code dataset. Split into M5A (Curriculum Foundation migrated into Postgres — `PostgresKnowledgeProvider`, seeded with NCERT Class 3 Mathematics) and M5B (`ConceptSearchProvider` abstraction with Postgres trigram search, replacing exact-name matching). Closed after a live production verification pass.

### M6 — Concept Agent (v1, single-turn)

Superseded M1's free-text teaching reply with a structured, single-turn Concept Agent running the Connect→Explain→Illustrate→Example→Check Understanding framework in one Claude call, built from Knowledge Retrieval (M5), Planning (M3), Personalization (M4), and Context (M1).

### M7 — Practice Agent + Assessment Agent

Practice question generation and answer evaluation, gated on Router Agent's own intent classification (`Practice`/`Assessment`) rather than Planning's diagnostic strategy — the first agents to fire live regardless of a learner's mastery history.

### M8 — Reflection Agent + Memory Agent

Reflection Agent synthesizes an Assessment Report into an internal Learning Reflection Report; Memory Agent merges that evidence into a real, Postgres-backed Learner Profile (`learner_profiles`, `learner_concept_mastery`) — the first real implementation of `LearnerStateProvider`, unblocking the mastery-dependent branches M4 and M6 had carried as tested-but-dormant since they were built.

### M9 — Safety Agent (full) + Evaluation Agent + Observability Agent

- **Safety Agent**: a two-layer Allow/Block gate (the original M0 keyword filter, then a new Claude-based classifier for Child Safety, Prompt Injection, Academic Integrity, Privacy, and Platform Safety) running *before* Router Agent — the first agent to touch any message. Fails closed (not open) on its own Layer 2 failure, the one deliberate exception to this codebase's fail-open convention.
- **Evaluation Agent**: internal, post-generation quality scoring for every Concept/Practice/Assessment interaction, with Safety implemented as a hard ceiling on the overall score (`min(safety, 39)` when unsafe) rather than an averaged dimension.
- **Observability Agent**: a read-only trace-reconstruction report (`getObservabilityReport`) reconstructing per-agent latency, token usage, cost, and error counts from the existing `events` table — a post-hoc aggregation function, not part of the request pipeline.
- Drafted the two architecture documents that had been blocking this milestone: [07_Evaluation_Framework.md](07_Evaluation_Framework.md) and [11_Policy_Engine.md](11_Policy_Engine.md).
- Voice Agent confirmed deferred indefinitely; no spec file exists.

### Production Verification Sweep + Token-Logging Housekeeping

Closing work before declaring the foundation complete:

- **[M0–M9 Production Verification Sweep](docs/implementation/M0-M9-Production-Verification-Sweep.md)**: full regression suite (176 mocked assertions), live database connectivity check, a complete code-level audit of RLS policies and pipeline wiring against the architecture docs, and a live authenticated end-to-end pass through the real chat pipeline, confirmed by the product owner — including the first live activation of M4/M6's previously-dormant non-Diagnostic branches. Found and fixed one pre-existing lint error; surfaced one new architectural finding (the `messages` table's RLS policy doesn't restrict `role`, allowing a student's own client to insert a fabricated `assistant`-role row — low blast-radius, self-only, tracked as a recommendation).
- **[Token-Logging Housekeeping Pass](docs/implementation/Token-Logging-Housekeeping.md)**: every LLM-based agent (Router, Safety Layer 2, Concept, Practice, Assessment, Reflection, Evaluation) now logs `model`, `inputTokens`, `outputTokens`, `estimatedCostUsd`, and `latencyMs` consistently, closing the two remaining Observability Agent open issues.

---

## Prior tags

- `v0.5.0-m4` — M4 (Personalization Agent)
- `v0.4.0-m3` — M3 (Planning Agent)
- `v0.3.0-m2` — M2 (Router Agent)
- `v0.2.0-m1` — M1 (Context Agent)
- `v0.1.0-m0` — M0 (Foundation)
