# MentorOS — Technical Showcase Guide

**Audience:** engineering leaders and reviewers at organizations like Anthropic, OpenAI, Microsoft, Google DeepMind, Khan Academy, Duolingo, and similar companies evaluating MentorOS as a piece of engineering work.
**This is not user documentation.** It's a guide to reviewing the codebase and architecture efficiently, written by the team that built it.

---

## What is MentorOS?

MentorOS is an AI-native tutoring platform for Primary and High School students, built as a genuine multi-agent system rather than one large prompt: thirteen single-responsibility agents (Context, Safety, Router, Planning, Personalization, Knowledge Retrieval, Concept, Practice, Assessment, Reflection, Memory, Evaluation, Observability) coordinating over a Next.js + Supabase (Postgres + Auth, RLS-enforced) + Anthropic Claude stack. Every milestone from project scaffolding through the full agent pipeline (M0–M9) is complete, documented, and — unusually for a project this stage — **live-verified against a real deployed environment**, not just passing unit tests.

## Why was it built?

As a demonstration of what production-quality, multi-agent AI system design looks like when architecture is treated as the source of truth from day one, not retrofitted after a prototype works. The project runs on a strict, self-imposed process (documented in `CLAUDE.md`): read only what's needed, never invent architecture that conflicts with documentation, stop and ask when documentation is missing or contradicts itself, one milestone at a time, always with an explicit implementation plan before code. That process — and this document's honest account of where it was actually followed and where it wasn't — is as much the subject of this showcase as the resulting product.

## What makes it different?

Three things, specifically:

1. **Safety is architecturally first-class, not bolted on.** The Safety Agent runs *before* the Router Agent — the first thing to touch any incoming message — and is the one component in the entire system that fails **closed**, not open, on its own errors. Every other agent degrades gracefully into a fallback on a transient failure (an explicit, named, codebase-wide convention); Safety alone will block every message platform-wide during an Anthropic outage rather than risk letting an unclassified message through. That tradeoff is written down, not hidden (`web/src/lib/agents/safety-agent.ts`'s own doc comment states the real consequence plainly).
2. **The system evaluates its own output, continuously, with safety as a hard ceiling — not an averaged input.** The Evaluation Agent scores every teaching interaction across six dimensions, but `overall_score = min(safety_subscore, 39)` whenever the response's own safety check fails — an excellent answer cannot average away a safety failure. This is a deliberate, documented product-owner decision (`07_Evaluation_Framework.md`), not a default.
3. **Nothing is silently assumed complete.** Every milestone's implementation doc has an honest "Open Issues" section. The production verification sweep that closed out M0–M9 found and fixed a real lint error and surfaced a real, still-open RLS gap — and reported both, rather than quietly fixing one and burying the other.

## What should a reviewer explore first?

In order of information density per minute spent:

1. **`08_Roadmap.md`** — the entire project narrative in one file: what was built, in what order, why, and what's explicitly deferred. Read this first; everything else is detail underneath it.
2. **`web/src/app/api/chat/route.ts`** — the actual orchestration. Every agent call, every event log, every fail-open/fail-closed branch, in the order they really execute.
3. **`docs/implementation/M0-M9-Production-Verification-Sweep.md`** — proof this isn't a demo. Live database connectivity, a full RLS/pipeline code audit, and a live authenticated end-to-end pass, with a finding (the `messages` RLS gap) reported rather than hidden.
4. **`15_Phase2_Roadmap.md`** and **`docs/ui-architecture/`** — this project's approach to product/UI work, held to the same architectural rigor as the backend: a complete design system and application architecture specified before a single React component was written for Phase 2.

## Flagship engineering capabilities

- **A real two-layer Safety Agent**: a free, deterministic keyword filter (Layer 1) as a floor, then a Claude-based classifier (Layer 2) for the categories that need judgment — Child Safety, Prompt Injection, Academic Integrity, Privacy, Platform Safety. (`web/src/lib/agents/safety-agent.ts`, `web/src/lib/safety/filter.ts`)
- **Deterministic post-processing over trusting the model for anything mechanically derivable** — mastery status, quality status, hallucination risk, and efficiency score are all computed in code from the model's raw scores, never asked of the model directly. This pattern recurs across four separate agents built months apart, evidence it's a real convention, not a one-off. (`web/src/lib/agents/assessment-agent.ts`, `evaluation-agent.ts`)
- **A consistent provider-abstraction / dependency-injection pattern**, from `KnowledgeProvider`/`ConceptSearchProvider`/`LearnerStateProvider` (M3/M5/M8) through to the newly-designed `CurriculumProvider` (Phase 2's Learning Commons integration) — every storage/retrieval concern is an interface injected at one composition root (`route.ts`), never imported directly by decision logic. This is also what makes every agent unit-testable without hitting the Anthropic SDK — the same injected-function seam (`explainConcept(context, generate)`) appears in every generative agent.
- **Full token/cost/latency observability**, recently completed: every LLM-based agent logs `model`/`inputTokens`/`outputTokens`/`estimatedCostUsd`/`latencyMs` on its own event, feeding a read-only trace-reconstruction Observability Agent (`web/src/lib/agents/observability-agent.ts`) built as a pure, directly-testable aggregation function separate from its thin Supabase-querying wrapper.
- **RLS as the actual security boundary**, not application-code checks layered on top — every table's access control is a Postgres policy, verified live (a fabricated cross-student read was confirmed to return zero rows, not just assumed correct from the policy text).

## Which architecture decisions demonstrate production thinking?

- **Safety-before-Router was a real reordering decision**, made after the fact, that required updating the Safety Agent's own spec doc (`05_Agent_Architecture/03_Safety_Agent.md`) to remove a now-incorrect dependency on Router — a small thing, but the kind of documentation drift most projects leave stale.
- **The "constrain response" capability was explicitly deferred, not half-built.** The original design called for a graduated Medium-risk response (hints-only mode); M9 shipped Allow/Block only because the routing/prompt-transformation plumbing it needs doesn't exist yet, and says so directly in `11_Policy_Engine.md` rather than shipping a partial, unreliable version of it.
- **A subtle correctness issue was caught and fixed during design, not after shipping**: Evaluation Agent's Safety dimension was originally going to mirror Safety Agent's own Allow/Block gate — but since Safety Agent gates *before* generation, every interaction Evaluation Agent ever sees was already "Allowed," making that dimension a constant, meaningless signal. It was redefined as an independent, post-generation defense-in-depth check instead (`07_Evaluation_Framework.md`).
- **Two genuinely separate deployment environments** (staging/production, separate Supabase projects, separate Vercel environment scoping) were verified independently via `/api/health`, not just configured and assumed to work.
- **The Phase 2 UI architecture (this very body of documentation) treats product/design work with the same rigor as the backend** — a full design system (tokens, components, accessibility to WCAG 2.1 AA) and a complete application architecture (30 screens, 25 API contracts, an explicit component-ownership map preventing duplicate patterns) were specified and internally reconciled *before* implementation, with real open questions (parent-consent verification, teacher-roster verification) named rather than papered over.

## Which files should be reviewed first?

```
08_Roadmap.md                                          — the whole project, one file
web/src/app/api/chat/route.ts                           — the actual orchestration
web/src/lib/agents/safety-agent.ts                       — fail-closed, by design
web/src/lib/agents/evaluation-agent.ts                    — the safety-overrides-everything gate
web/src/lib/agents/observability-agent.ts                 — pure-function aggregation, fully tested
supabase/migrations/0001_init.sql                         — the RLS model, in full
07_Evaluation_Framework.md                                — the scoring methodology
11_Policy_Engine.md                                       — the enforcement model
docs/implementation/M0-M9-Production-Verification-Sweep.md — proof of live verification
15_Phase2_Roadmap.md                                       — how Phase 2 was scoped and negotiated
```

## Recommended 5-minute walkthrough

1. Sign in at `/sign-in`, land on `/chat`.
2. Ask a genuine math question ("Can you explain addition to me?") — watch a real, structured teaching response arrive.
3. Ask for practice ("Give me some practice questions on addition") — a distinct agent (Practice, not Concept) responds, gated on Router's own intent classification, not a keyword match.
4. Answer one of the practice questions — Assessment Agent scores it; Reflection and Memory Agents run internally (never shown to the student, by design — `11_Reflection_Agent.md`).
5. Send an unsafe test phrase — watch the immediate, calm, category-appropriate decline, with zero further Anthropic API calls made for that turn (`route.ts`'s own comment states this explicitly).

## Recommended 15-minute architecture deep dive

1. Read `08_Roadmap.md` in full (≈5 min) — the project's own account of what was built and why, including what was deliberately *not* built.
2. Read `web/src/app/api/chat/route.ts` top to bottom (≈4 min) — every architectural decision above is visible directly in this one file's control flow and comments.
3. Skim `web/src/lib/agents/safety-agent.ts` and `evaluation-agent.ts` (≈3 min) — the two agents where the most consequential, explicitly-reasoned tradeoffs live.
4. Skim `supabase/migrations/0001_init.sql` (≈2 min) — confirm the RLS claims above against the actual policy definitions, not just this document's description of them.
5. Skim `docs/implementation/M0-M9-Production-Verification-Sweep.md`'s "What Failed" and "Architectural Concern Found" sections (≈1 min) — the fastest way to judge whether this project's own self-reporting can be trusted: does it admit real gaps, or only claim success?
