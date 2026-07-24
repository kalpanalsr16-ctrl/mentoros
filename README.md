# MentorOS

An AI-native tutoring platform for Primary and High School students, built as a genuine multi-agent system — not one large prompt wearing a chat UI. Every teaching interaction passes through a real pipeline of specialized agents (safety, intent routing, planning, personalization, teaching, practice, assessment, memory, evaluation), and that pipeline is inspectable, not a black box: students, teachers, and technical reviewers can all open the same request and see exactly which agent did what, in what order, at what cost.

Currently scoped to **NCERT Class 3 Mathematics**, with the architecture built to extend beyond it.

## What's actually built

This is not a prototype of a few screens — it's a complete product surface across three roles, backed by a real multi-agent pipeline with database-level security enforcement (Row Level Security, not just application checks) throughout.

### Student

- A tutoring chat with streaming replies, Markdown/LaTeX rendering, retry/cancel, and structured Practice/Assessment cards in place of flattened text
- An onboarding flow that captures grade, goals, and learning style, feeding directly into how the Personalization Agent adapts every later reply
- A visual Learning Roadmap (chapter → concept sequence, done/current/next status), a Progress view, Practice/Assessment History, a Revision Planner, Achievements, and Profile/Settings
- A per-message **"View reasoning"** action opening the AI Transparency Panel — the actual pipeline trace for that exact reply, off by default, always available

### Teacher (Studio)

- A roster system (classes, students, roster management) with teacher-scoped Row Level Security — a teacher only ever sees data for students in their own classes, enforced at the database, not just in a route handler
- A Lesson Planner and an Assessment Builder (deliberately manual-only — no invented AI-authoring workflow where the product docs didn't ask for one)
- Progress Analytics, Misconception Reports, and an Intervention Planner surfacing which students need attention and why
- A Homework Generator reusing the same Practice Agent generation *pattern* through a separate, teacher-facing invocation path
- A Curriculum Explorer for browsing MentorOS's own curriculum (Learning Commons — an external curriculum-standards integration — is scoped as a later expansion, not required for any of the above)
- An **AI Lesson Assistant** — conversational authoring help for teachers, in a data domain structurally separate from student conversations (different tables, different RLS policies, no shared code path at all)
- An **Evaluation Dashboard** — AI-quality trends (safety-clean rate, hallucination-risk rate, per-dimension score trends) for every interaction a teacher's students have had
- An **Architecture Explorer** — a full-page, standalone view of recent pipeline traces across the platform, for technical reviewers

### Parent

- A verified linking flow (a parent must be explicitly approved by the student before *any* data becomes visible — zero access on a pending request)
- A read-only dashboard per linked child: progress, strengths/weaknesses, recommendations, revision status, achievements, and a weekly summary

## The pipeline, made visible

A single student message can pass through **Safety → Router → Planning → Personalization → Concept/Practice/Assessment → Memory → Evaluation**, each stage logged to a shared `events` table with a common trace ID. The **Observability Agent** reconstructs any trace from that log after the fact — read-only, no involvement in the live request — and the **AI Transparency Panel** is simply that reconstruction rendered as a UI, reachable from the exact message it explains or from the standalone Architecture Explorer.

See [`docs/adr/`](docs/adr/) for the reasoning behind the biggest structural decisions, and [`docs/diagrams/`](docs/diagrams/) for sequence diagrams of the pipeline itself.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend + Backend | Next.js 16 (App Router, Turbopack, TypeScript) — one codebase, no separate API service |
| Database + Auth | Supabase (Postgres + Auth), Row Level Security on every table |
| LLM | Anthropic Claude, via the official SDK |
| Hosting | Vercel |
| Error monitoring | Sentry |
| Testing | Node's built-in test runner, no bundler |
| CI | GitHub Actions — test, typecheck, lint, build on every PR and push to `main` |

Full rationale for every choice above, including what was deliberately *not* chosen and why, lives in [`06_Technical_Architecture.md`](06_Technical_Architecture.md).

## Getting started

```bash
cd web
npm install
cp .env.local.example .env.local   # fill in Supabase, Anthropic, Sentry values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). See [`web/README.md`](web/README.md) for the codebase's internal structure.

```bash
npm test        # 167 assertions, no bundler
npm run lint
npm run build    # also runs the TypeScript check
```

## Documentation map

This repository treats documentation as the source of truth — if code and docs conflict, the docs win until explicitly revised. Start here:

| Doc | Covers |
|---|---|
| [`00_Product_Principles.md`](00_Product_Principles.md), [`01_Vision.md`](01_Vision.md), [`02_PRD.md`](02_PRD.md) | What MentorOS is and why |
| [`06_Technical_Architecture.md`](06_Technical_Architecture.md) | Every stack decision, with rationale and an evolution path |
| [`05_Agent_Architecture/`](05_Agent_Architecture/) | One spec per agent — purpose, inputs, outputs, state, success criteria |
| [`docs/ui-architecture/`](docs/ui-architecture/) | Every screen, by role, plus the full task-by-task implementation sequence |
| [`docs/adr/`](docs/adr/) | Architecture Decision Records — the *why* behind the biggest calls |
| [`docs/diagrams/`](docs/diagrams/) | Mermaid sequence diagrams of the real request flows |
| [`docs/api/`](docs/api/) | Endpoint reference — every route, method, auth requirement, request/response shape |
| [`docs/demo-script.md`](docs/demo-script.md) | A shot-by-shot walkthrough for demoing the product |
| [`CHANGELOG.md`](CHANGELOG.md) | Milestone-by-milestone build history |

## Current status

Every epic in [`docs/ui-architecture/13_Implementation_Sequence.md`](docs/ui-architecture/13_Implementation_Sequence.md) is shipped, including the full Teacher Studio (14 modules), Student Experience (8 modules), Parent Portal, AI Transparency Panel, and Evaluation Dashboard. Three things are deliberately scoped as *later expansion*, not blockers to demonstrating the product today:

- **Learning Commons** (external curriculum-standards integration) — blocked on provisioning an API key; MentorOS's own curriculum is fully browsable without it
- **Voice mode** — not started; text/click interaction is the complete experience today
- **A regression/benchmark evaluation harness** — the Evaluation Dashboard already surfaces real per-interaction AI-quality data; automated regression detection over time is separate, later infrastructure

A small, genuinely optional gap also remains: a handful of design-system primitives documented in `docs/design-system/03-Component-Library.md` (Input, Select, Modal, Table, and a few others) were never built as shared components — every form and empty/loading state was hand-built per screen instead. Nothing is broken or blocked by this; it's tracked, not hidden.
