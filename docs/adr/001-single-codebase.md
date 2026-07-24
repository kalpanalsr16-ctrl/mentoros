# ADR-001: One Next.js codebase for frontend and backend

**Status:** Accepted
**Source:** [`06_Technical_Architecture.md`](../../06_Technical_Architecture.md), Decision 1

## Context

MentorOS needs a student-facing UI, a teacher-facing UI, a parent-facing UI, and server-side agent/LLM logic. The conventional enterprise pattern splits these into a frontend app and one or more backend services communicating over a network API.

## Decision

Use a single Next.js application (App Router) for everything — UI and server-side logic in one codebase, one deployment, one repository. Server-side agent logic lives in Route Handlers within the same project, not a separate API service.

## Consequences

- No network hop, no separate deployment pipeline, no API-versioning problem between frontend and backend — for a solo-buildable, single-team product at this scale, that overhead has no offsetting benefit yet.
- Every agent, every route, and every UI component share one `tsconfig`, one dependency tree, one type system — a change to a shared type (e.g. `ClaudeMessage`) is caught by one `tsc` run, not by contract-testing across repos.
- The explicit reconsideration trigger (from `06_Technical_Architecture.md`'s own Evolution Path): split frontend and backend if agent orchestration becomes heavy enough (background jobs, long-running processes) to need independent scaling from the chat screen — realistically not before a much later milestone, if ever.
