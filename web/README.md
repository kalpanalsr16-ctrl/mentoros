# MentorOS — Web App

The Next.js application for MentorOS, an AI-native tutoring platform for Primary and High School students. This is the single codebase serving both the student-facing frontend and the server-side API/agent logic (see [06_Technical_Architecture.md](../06_Technical_Architecture.md), Decision 1).

For product context, architecture decisions, and per-task build records, start at the repository root — this file only covers running the app itself.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Requires a `.env.local` file — copy `.env.local.example` and fill in real Supabase and Sentry values (see the comments in that file for where to find each one).

## Stack

- Next.js 16 (App Router, Turbopack, TypeScript, `src/` layout)
- Supabase (Postgres + Auth), accessed via `@supabase/ssr`
- Sentry for error monitoring

**This Next.js version has real breaking changes from what training data alone would assume** (e.g. `middleware.ts` → `proxy.ts`). See [AGENTS.md](./AGENTS.md) and `node_modules/next/dist/docs/` before making framework-level changes.

## Structure

- `src/app/` — routes (`/`, `/sign-up`, `/sign-in`, `/chat`, `/api/health`, `/api/chat`)
- `src/components/` — UI components
- `src/lib/supabase/` — browser/server Supabase clients, session proxy
- `src/lib/safety/` — baseline safety filter
- `src/lib/observability/` — trace ID + event logging
- `supabase/migrations/` — committed SQL migrations (source of truth for schema)

## Useful Commands

```bash
npm run build   # production build, also runs the TypeScript check
npm run lint
```

## Documentation

- [../docs/implementation/](../docs/implementation/) — what was actually built, task by task
- [../docs/milestones/](../docs/milestones/) — milestone completion reports
- [../06_Technical_Architecture.md](../06_Technical_Architecture.md) — stack decisions and rationale
