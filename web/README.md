# MentorOS — Web App

The Next.js application for MentorOS, an AI-native tutoring platform for Primary and High School students. This is the single codebase serving both the student-facing frontend and the server-side API/agent logic (see [06_Technical_Architecture.md](../06_Technical_Architecture.md), Decision 1).

For product context, architecture decisions, and per-task build records, start at the repository root — this file only covers running the app itself.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Requires a `.env.local` file — copy `.env.local.example` and fill in real Supabase, Sentry, and Anthropic values (see the comments in that file for where to find each one).

## Stack

- Next.js 16 (App Router, Turbopack, TypeScript, `src/` layout)
- Supabase (Postgres + Auth), accessed via `@supabase/ssr`
- Anthropic Claude (`@anthropic-ai/sdk`) for teaching replies and Zod-validated structured-output intent classification (`zod`)
- Sentry for error monitoring

**This Next.js version has real breaking changes from what training data alone would assume** (e.g. `middleware.ts` → `proxy.ts`). See [AGENTS.md](./AGENTS.md) and `node_modules/next/dist/docs/` before making framework-level changes.

## Structure

- `src/app/` — routes (`/`, `/sign-up`, `/sign-in`, `/chat`, `/app/*` Student, `/studio/*` Teacher, `/parent/*` Parent, `/api/health`, `/api/chat`) — the three new route groups are Application Shell only (Sprint 1, Phase 2): routing, auth/role gating, and layout chrome, with placeholder page content until the screens themselves are built in later sprints (see `docs/ui-architecture/13_Implementation_Sequence.md`)
- `src/design-system/` — the MentorOS Design System (Phase 2): `tokens/` (color/typography/spacing/motion/breakpoints, as both typed TS and a mirrored `tokens.css`), `primitives/` (Button, Avatar, Divider, Skeleton, Spinner — the subset Sprint 1's shell needed; the rest of `docs/design-system/03-Component-Library.md`'s inventory is added incrementally, screen by screen), `layouts/` (Header, Footer, Sidebar, PageContainer, MinimalShell, TeacherShell, ThemeToggle, PlaceholderPage), `hooks/` (`use-theme`, `use-media-query`), `icons/` (Lucide re-export wrapper)
- `src/components/` — UI components predating the Design System (chat's own components; untouched by Sprint 1)
- `src/lib/auth/` — `resolve-shell.ts`: pure role → route-namespace mapping used by the three new route-group layouts
- `src/lib/supabase/` — browser/server Supabase clients, session proxy, `use-sign-out.ts` (shared sign-out hook for the new shells)
- `src/lib/safety/` — `filter.ts`: Layer 1 of Safety Agent (M9) — the original M0 keyword filter, seven categories, still the confirmed floor Layer 2 must not regress below
- `src/lib/agents/` — Context Agent, Router Agent (`intent-object.ts` contract), Planning Agent (`planning-context.ts` contract, teaching-strategy decision logic), Personalization Agent (`personalization-context.ts` contract, teaching style/pace/difficulty decision logic), Concept Agent (`concept-agent.ts` — structured, single-turn teaching response; v1, see M6-01), Practice Agent (`practice-agent.ts` — structured practice sets), Assessment Agent (`assessment-agent.ts` — structured mastery evaluation; both v1, see M7-01), Reflection Agent (`reflection-agent.ts` — structured, internal-only learning synthesis), Memory Agent (`memory-agent.ts` — pure, deterministic learner-profile merge, no LLM call; both v1, see M8-01), Safety Agent (`safety-agent.ts` — two-layer Allow/Block gate, runs before Router Agent), Evaluation Agent (`evaluation-agent.ts` — internal, post-generation quality scoring with a Safety-overrides gate; both v1, see M9-01), and Observability Agent (`observability-agent.ts` — read-only trace-reconstruction report over the `events` table, not part of the request pipeline; v1, see M9-02)
- `src/lib/knowledge/` — `KnowledgeProvider` (Postgres-backed, `PostgresKnowledgeProvider`) and `ConceptSearchProvider` (Postgres trigram search, `TrigramConceptSearchProvider`) interfaces, split per M5's design so storage and search can evolve independently; both storage-agnostic, replacing M3's static in-code dataset
- `src/lib/learner/` — `LearnerStateProvider` (Postgres-backed, `PostgresLearnerStateProvider`, real since M8) and `LearnerProfileWriter` (`PostgresLearnerProfileWriter` — the only write path to the learner profile, per Memory Agent's spec) interfaces
- `src/lib/llm/` — Claude API wrapper (`generateTeachingReply`, `classifyIntentWithClaude`, `classifySafetyWithClaude`, `generateConceptExplanation`, `generatePracticeSet`, `generateAssessment`, `generateReflection`, `generateEvaluation`, `estimateCostUsd` — shared token-cost estimate every agent's event logging uses, see [Token-Logging-Housekeeping.md](../docs/implementation/Token-Logging-Housekeeping.md))
- `src/lib/security/` — per-student rate limiting on `/api/chat`
- `src/lib/observability/` — trace ID + event logging
- `supabase/migrations/` — committed SQL migrations (source of truth for schema)
- `supabase/rollbacks/` — documented reversal script for each forward migration (not auto-applied; run manually if a migration needs undoing)

## Useful Commands

```bash
npm run build   # production build, also runs the TypeScript check
npm run lint
npm test        # runs tests/*.test.ts via Node's built-in test runner (no bundler)
```

## Documentation

- [../docs/implementation/](../docs/implementation/) — what was actually built, task by task
- [../docs/milestones/](../docs/milestones/) — milestone completion reports
- [../06_Technical_Architecture.md](../06_Technical_Architecture.md) — stack decisions and rationale
