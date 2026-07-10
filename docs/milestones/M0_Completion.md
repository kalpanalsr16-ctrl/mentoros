# Milestone M0 — Completion Report

**Status:** ✅ Closed
**Closed:** 2026-07-10
**Tag:** `v0.1.0-m0`
**Reviewer:** Lead Engineer gate review (this document)

---

## Objectives

M0's job was to build the platform's ground floor before any real teaching intelligence exists: a working Next.js codebase, a real Supabase-backed identity and data layer with Row Level Security, a persisted (placeholder-reply) chat loop, a baseline safety net, error monitoring, and a genuinely separate staging deployment — proving the "one codebase, Supabase-backed, agent-ready" architecture from [06_Technical_Architecture.md](../../06_Technical_Architecture.md) actually holds before any agent is built on top of it.

M0 explicitly does **not** include real teaching intelligence, real LLM calls, or the multi-agent pipeline described in [05_Agent_Architecture/](../../05_Agent_Architecture/) — those begin in M1.

---

## Tasks Completed

All 10 tasks, each committed individually and verified before the next began:

| # | Task | Commit | Doc |
|---|---|---|---|
| 1 | Project foundation (Next.js scaffold, `/api/health`) | `bff5a5a` | [M0-01](../implementation/M0-01-Project-Foundation.md) |
| 2 | Supabase connection | `5293f1d` | [M0-02](../implementation/M0-02-Supabase-Connection.md) |
| 3 | Database schema (profiles, conversations, messages, events + RLS) | `c130a7d` | [M0-03](../implementation/M0-03-Database-Schema.md) |
| 4 | Authentication (sign-up/sign-in, route protection) | `29d7e33` | [M0-04](../implementation/M0-04-Authentication.md) |
| 5 | Chat shell (UI only, local state) | `6dac687` | [M0-05](../implementation/M0-05-Chat-Shell.md) |
| 6 | Message persistence (real save/reply loop) | `d9819b1` | [M0-06](../implementation/M0-06-Message-Persistence.md) |
| 7 | Trace ID + event logging | `af06c1f` | [M0-07](../implementation/M0-07-Event-Logging.md) |
| 8 | Baseline safety filter | `5b254d6` | [M0-08](../implementation/M0-08-Safety-Filter.md) |
| 9 | Sentry error monitoring | `f876875`, `72002c5` | [M0-09](../implementation/M0-09-Monitoring.md) |
| 10 | Staging deployment | `aad9de6` | [M0-10](../implementation/M0-10-Staging-Deployment.md) |

Working tree is clean; both `main` and `staging` branches are pushed and in sync with `origin` as of this report.

---

## Architecture Decisions

The decisions that shaped M0 (full rationale in each task's implementation doc):

- **One codebase, not many services** — frontend and backend (API routes) live in a single Next.js app, per `06_Technical_Architecture.md` Decision 1. Proven end to end by Task 1.
- **Row Level Security as the sole authorization mechanism** for student-scoped tables — no application-level "is this the owner" checks duplicate what RLS already enforces (Task 3).
- **`profiles` shares its primary key with `auth.users`**, auto-populated via a `security definer` trigger, rather than app-code-driven profile creation (Task 3).
- **`events` is insert-only with no SELECT policy** — a deliberate audit-log design, not an oversight (Task 3, Task 7).
- **The M0 safety filter is deterministic pattern matching, not an AI classifier** — the only option before an LLM exists in the pipeline; the real Safety Agent is deferred to M9 (Task 8).
- **Sentry environment tagging uses `VERCEL_ENV`, not `NODE_ENV`** — a self-caught bug, since `NODE_ENV` is always `"production"` in any Next.js build regardless of deployment target (Task 9).
- **Staging reuses the original dev Supabase project; Production is a freshly created, empty one** — safer than trying to "clean" a project that already had test data (Task 10).

---

## Database Changes

Single migration, `web/supabase/migrations/0001_init.sql`, applied to both Supabase projects (staging and production):

- `profiles` — one row per student, RLS-scoped to `auth.uid()`, auto-created on signup via trigger.
- `conversations` — one row per chat session, `subject` defaults to `mathematics`, status-checked.
- `messages` — role-checked (`system | user | assistant`), RLS-scoped via the owning conversation.
- `events` — insert-only audit log, indexed on `trace_id`/`conversation_id`/`student_id`/`created_at`.

No destructive migrations were required during M0 — schema was designed with RLS from the first version rather than retrofitted.

---

## Infrastructure

- **Hosting:** Vercel, git-connected to a private GitHub repository (`kalpanalsr16-ctrl/mentoros`), Root Directory set to `web/`.
- **Environments:** Production (`main` branch) and Preview/staging (`staging` branch), each with independently scoped environment variables, confirmed via `vercel env ls production` / `vercel env ls preview`.
- **Databases:** two genuinely separate Supabase projects — staging retains real test data accumulated across M0 verification; production started empty.
- **Live verification at report time:** both deployed environments return `200` with `"database":"connected"` from `/api/health`.

| Environment | URL | Health |
|---|---|---|
| Production | `mentoros-acvd8e68p-kalpanalsr16-ctrls-projects.vercel.app` | ✅ `200`, database connected |
| Staging (Preview) | `mentoros-kogkn3e5y-kalpanalsr16-ctrls-projects.vercel.app` | ✅ `200`, database connected |

---

## Security

- Row Level Security enforced and independently verified (not just declared) on every student-scoped table — cross-student read/write attempts were tested and correctly rejected (Task 3, Task 6).
- Two security-relevant decisions were deliberately routed through explicit owner authorization rather than made unilaterally: disabling Vercel Deployment Protection (SSO) so students without Vercel accounts can reach the app, and choosing to paste schema SQL directly into Supabase's SQL Editor rather than weaken TLS verification for a scripted migration.
- Credentials (`.env.local`, service-role-equivalent secrets) were never committed; `.gitignore` was corrected once (M0-02) after it was found to be over-broad in a way that would have also excluded the intentionally-committed `.env.local.example` template.
- The safety filter (Task 8) runs entirely server-side — a request bypassing the UI is still filtered.

---

## Observability

- Every `/api/chat` request produces a trace ID and logs outcome-specific events (`message_received`, `safety_blocked`, `reply_sent`, `safety_reply_sent`, `message_rejected`, `reply_failed`) to the `events` table (Task 7).
- Sentry captures unhandled errors server-side and edge-side, correctly tagged by real deployment environment (Task 9). **Browser-side capture is wired up but not independently exercised with a real client-thrown error** — see Technical Debt.
- `npm audit`, build output, and TypeScript checks are clean (see Testing).

---

## Documentation

- `docs/implementation/M0-01` through `M0-10` — now all fully populated with real, verified detail as part of this gate review (previously M0-02 through M0-10 were unpopulated templates by design, since the project's process is to only document finished work).
- `web/README.md` — was still the unmodified `create-next-app` boilerplate; rewritten as part of this gate review to reflect the actual app, stack, and structure.
- **Gap found and only partially resolved:** `08_Roadmap.md`, `07_Evaluation_Framework.md`, and `10_Observability.md` at the repository root are all **empty files (0 bytes)**. Per this project's own `CLAUDE.md`, documentation is the source of truth and the roadmap specifically is where M0-M9 milestone scope is supposed to be defined. `08_Roadmap.md`'s absence is a real, load-bearing gap — the Concept Agent's own documented dependency list (`08_Concept_Agent.md`) requires four other agents (Knowledge Retrieval, Planning, Personalization, Context) to exist first, and only a roadmap can define how that dependency graph is supposed to be sliced into incremental milestones. This is called out in detail under Risks, and is *not* silently resolved by this report — see the note at the end of this document.

---

## Testing

- `npm run build` — clean, zero TypeScript errors, all 7 routes recognized (verified fresh as part of this gate review, not carried over from memory).
- No `TODO`/`FIXME`/`XXX` markers found in `web/src` (verified via grep as part of this gate review).
- RLS correctness verified via standalone scripts signed in as a real test student (cross-student reads/writes correctly rejected) — necessary because cookie-based Next.js routes aren't realistically `curl`-testable for authenticated flows.
- ~20 unsafe test phrases across all four safety categories verified against `checkMessageSafety()` directly, and at least one verified live through the deployed `/api/chat` endpoint.
- Full manual end-to-end acceptance pass performed by the product owner against the **live staging URL**: sign-in, send-message-and-reload persistence, and unsafe-message decline all confirmed working ("It is perfect, looks fine.").

---

## Risks

1. **`08_Roadmap.md` is empty on disk.** This is the single biggest open risk coming out of M0: it's this project's designated source of truth for milestone sequencing, and the agent specs it's supposed to sequence have real, non-trivial dependencies between them (see Concept Agent, above). Planning M1 without it means either reconstructing lost content or guessing at scope — both of which this report deliberately avoids doing unilaterally (see closing note).
2. **`07_Evaluation_Framework.md` and `10_Observability.md` are also empty.** Lower urgency than the roadmap, but the Evaluation Agent (M0-M9 catalog) and any future observability-strategy work will eventually need them.
3. Staging's Supabase project carries real accumulated test data from M0 verification — harmless, but anyone querying staging directly should know it isn't a clean fixture.
4. Client-side Sentry capture is unverified in practice (wired up, not exercised).

---

## Lessons Learned

- Verifying "connected" claims with a real network round trip (and a deliberately-broken counter-test) caught a genuine false positive early (`supabase.auth.getSession()` vs. a direct `fetch`) that would otherwise have made the M0-02 health check meaningless.
- Cookie-based, authenticated Next.js routes need a different testing strategy (a real signed-in script client) than stateless routes (`curl` is sufficient) — this shaped how RLS was verified throughout M0.
- A low-priority open issue noted early (M0-01: git commit author identity) turned out to be a real deployment blocker by M0-10 — worth treating "low priority, deferred" issues as genuinely deferred, not forgotten, since their cost can change as the project moves closer to production infrastructure.
- Documentation debt compounds silently: `08_Roadmap.md` being empty went unnoticed through nine completed tasks because nothing in the day-to-day build loop required reading it — it only surfaced once M1 planning actually needed it.

---

## Technical Debt

| Item | Severity | Notes |
|---|---|---|
| `08_Roadmap.md` empty on disk | High | Blocks properly-grounded M1 scoping; see Risks and closing note |
| `07_Evaluation_Framework.md`, `10_Observability.md` empty | Medium | Not yet load-bearing, but will be |
| Client-side Sentry capture unverified | Low | Same SDK pattern as the verified server path |
| No region-specific crisis hotline in self-harm decline | Low | Deliberate, pending region confirmation |
| 2 moderate `npm audit` advisories | Low | Pre-existing in `create-next-app`'s dependency tree, not introduced by this project |
| Sentry source map upload deferred | Low | Needs a Sentry auth token not yet provisioned |

---

## Final Acceptance Checklist

| # | Check | Result |
|---|---|---|
| 1 | Every M0 acceptance criterion met | ✅ Sign-in + message send, persisted message+reply with trace ID, ~20 unsafe phrases blocked, staging genuinely separate from production — all verified live |
| 2 | Application builds successfully | ✅ Clean `npm run build`, zero TypeScript errors (re-verified fresh for this report) |
| 3 | Deployment healthy | ✅ Both Production and Staging return `200` / `database: connected` |
| 4 | Supabase integration verified | ✅ Real connectivity check, RLS independently verified, two genuinely separate projects |
| 5 | Sentry integration verified | ✅ Server-side capture verified with correct environment tagging; client-side wired but not independently tested (logged as debt) |
| 6 | Environment variables verified | ✅ Correctly scoped per environment in Vercel; `.env.local.example` accurate and committed; real secrets never committed |
| 7 | Documentation complete | ⚠️ M0's own implementation docs and `web/README.md` are now complete (fixed during this review); root-level `08_Roadmap.md`/`07_Evaluation_Framework.md`/`10_Observability.md` remain empty — flagged, not fixed, by this report |
| 8 | README up to date | ✅ Fixed during this review (was still `create-next-app` boilerplate) |
| 9 | All decisions documented | ✅ Captured in each task's implementation doc and summarized above |
| 10 | No stray TODOs / incomplete work | ✅ No `TODO`/`FIXME`/`XXX` in source; all open items are explicitly logged as Technical Debt, not silently left in code |

**Verdict: M0 is functionally complete and closed.** Every product-facing acceptance criterion is met and verified against the live staging deployment. The one item this report does **not** resolve on its own is the empty `08_Roadmap.md` — per this project's own CLAUDE.md ("If required documentation does not exist: Stop. Recommend what should be documented. Do not invent missing product requirements."), that gap is being surfaced to the product owner rather than filled in unilaterally before M1 planning proceeds.
