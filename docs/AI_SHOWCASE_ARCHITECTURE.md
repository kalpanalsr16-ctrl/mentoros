# MentorOS AI Showcase — Architecture Audit and Proposal

Status: **proposal, awaiting approval.** No code has been changed for this work.
Scope: the "Explore the AI System" showcase for the designated demo account, plus a
recruiter-safe way to reach it. Student-facing UX must not change.

---

## 1. What already exists

Most of the substrate the showcase needs is already built. The showcase should expose it, not rebuild it.

| Capability | Where it lives | Status |
|---|---|---|
| Trace IDs per request | `generateTraceId()` in `web/src/lib/observability/trace.ts`; `events.trace_id`; `messages.trace_id` (0007) | Real, every `/api/chat` turn |
| Event log (append-only) | `events` table, `payload jsonb`, self-read RLS (0006) | Real, ~30 event names |
| Per-node trace view | `TransparencyProvider` → `postgres-transparency-provider.ts`; `GET /api/observability/trace/[traceId]` | Real, 401/404 handled |
| Per-node latency, tokens, cost | `AgentNodeView` (`latencyMs`, `inputTokens`, `outputTokens`, `costUsd`, `model`) from `llm/client.ts` usage | Real for LLM stages |
| AI Transparency Panel | `design-system/patterns/TransparencyPanel`, opened from `ChatShell` and `TutorWorkspace` | Real |
| Architecture Explorer | `/explorer` (linked from Header), `getRecentTraces`, `ExplorerView` | Real; **shown to every signed-in account** |
| Voice trace linkage | `voiceTraceId` on `reply_sent` (`/api/chat`), `voice_transcription_completed`, `voice_turn_timing` | Real |
| Voice timing | Browser-reported `questionEndToTranscriptMs`, `transcriptToReplyMs`, `replyStartToAvatarAudioMs`, `totalMs` | Real, browser-side only |
| Evaluation scores | Evaluation Agent: `overall_score`, groundedness, accuracy, safety, efficiency; `evaluation_completed` | Real per turn |
| Golden eval set | `web/scripts/golden-eval-set.ts` (23 cases), `run-golden-eval.ts` | Real |
| Eval run storage | `eval_runs`, `eval_run_items` (0024/0025), `is_public` flag | Real |
| Public eval page | `/eval` reads latest `is_public` run | Real |
| Learner state | `learner_concept_mastery` (one row per student × concept), `assessment_completed`, `intent_detected`, `learning_plan_created` | Real, no history table |
| Learner UI | `/learning` (topics, revision, retention, patterns, snapshot modules in `web/src/lib/`) | Present; check against the My Learning plan before claiming done |
| Curriculum graph | `concept_relationships` (prerequisite/builds_on), seeded 4 concepts for Class 4 fractions and `give-and-take` | Real, small |
| Revision | `revision_schedule` table | **Exists, has no writers** |
| Demo account | `/demo` route signs in via `DEMO_STUDENT_EMAIL` / `DEMO_STUDENT_PASSWORD`; daily demo message cap (30); `seed-demo-learning-data.ts` | Real |
| Roles | `profiles.role` (student/teacher/parent, 0005); role self-escalation trigger (0023) | Real |
| Teacher studio | `/studio/*`, teacher read RLS (0012, 0014) | Real, separate domain (ADR 005) |
| Documentation | `docs/adr/` (9 ADRs), `docs/showcase/SHOWCASE.md` (reviewer guide), `docs/ui-architecture/07_AI_Transparency_Panel.md` | Real |

Notes that matter for the design:

- **Observability is custom, not Langfuse** (ADR 008). The transparency provider is already an interface, so a future backend can replace the Postgres one.
- **No chain-of-thought is logged.** Event payloads are structured decisions (route, confidence, strategy, scores, misconception strings). The transparency provider documents this, and the showcase must keep it that way.
- **Tracing is per request, not per conversation.** Voice turns link to chat turns through `voiceTraceId`. The chat `trace_id` is stored on the assistant message.

## 2. What data we already capture

Per tutoring turn (all keyed by `trace_id`):

- `message_received` / `safety_blocked` (safety verdict)
- `intent_detected` (intent, confidence) or `routing_failed`
- `learning_plan_created` (strategy, difficulty, pace; **no `conceptId`**)
- `practice_generated` (`conceptId`, `conceptName`, `questionCount`, `difficulty`; **no correctness**)
- `concept_explained` (**no `conceptId`**)
- `assessment_completed` (`conceptId`, `masteryScore` 0–100 for the turn, `misconceptions[]`, `recommendedNextStep`)
- `evaluation_completed` (overall, groundedness, accuracy, safety, efficiency; `hallucination_detected`, `low_quality_detected`)
- `reflection_completed`, `learner_profile_updated`, `memory_update_failed`
- `reply_sent` (`source`, `voiceTraceId`, model, tokens, latency)
- Per LLM call: model, input/output tokens, latency (cost derived from tokens)
- Voice: `voice_recording_started`, `voice_transcription_completed` / `_failed` (lengths, latency), `avatar_*`, `voice_turn_timing`

Per student (state, not history): `learner_concept_mastery` (`mastery_score`, `attempts`, `last_practiced_at`, `common_mistakes[]`), `revision_schedule` (empty).

## 3. What is missing

| Gap | Impact on showcase | Fix scope |
|---|---|---|
| `concept_explained` and `learning_plan_created` lack `conceptId` | Cannot join a teaching turn to a concept for the Learner Model's "why" | Add field to existing payloads (Concept Agent and Planning logging). Small, no schema change |
| No per-question correctness or hint count | Cannot show "answered 3 of 4 correctly" or hint use | Not available. Show "Not currently instrumented". Do not invent |
| No mastery history table | Retention trend and "mastery over time" need on-demand reconstruction | Reuse the `assessment_completed` weekly-bucket pattern (already used by `buildWeeklySummary`) |
| `revision_schedule` has no writers | "What should I revise" is derived from mastery and retention, not scheduled reviews | Keep derived. Do not claim a scheduler exists |
| Eval runs have no model or prompt version column | Cannot answer "did version A beat version B" | Add `version_label`/`model` to `eval_runs` (small migration, needs review) |
| Eval set is 23 cases, no rubric fields stored per case | Benchmark numbers would be thin | Extend case schema; run before showing any score |
| No experiment table | Cannot show experiments | Build the framework with no completed experiment |
| Avatar TTFA is browser-measured only | Shows what the browser saw, not Tavus internal timing | Label it as browser-observed |
| Voice path has no cost (Muse) | Cost view covers LLM stages only | Show Muse cost as "not instrumented" unless Muse bills per call and that is confirmed |
| No percentile calculation | Sample sizes are small | Show p50/p90 only above a stated minimum n; label the n |

## 4. Proposed architecture

Principle: **showcase reads, never writes; tutoring is untouched.** Showcase routes sit beside `/api/chat`, not inside it. A showcase failure cannot affect tutoring.

```
Showcase UI (client, gated)
  └─ /api/showcase/* (server, capability-checked, each route re-checks)
       ├─ traces:    TransparencyProvider + getRecentTraces (reuse)
       ├─ learner:   learner_concept_mastery + events (new read module, pure aggregation)
       ├─ eval:      eval_runs / eval_run_items (reuse /eval read path)
       ├─ perf:      events latency/token fields (new aggregation, sample-size labelled)
       └─ case study: static, versioned content from docs/ (no runtime generation)
```

Reuse decisions:

- Flight Recorder = existing Transparency Panel content, presented as a full timeline. Adds: voice stages (from `voice_*` events joined by `voiceTraceId`), and "Not currently instrumented" placeholders.
- System Architecture = a diagram component whose nodes link to real trace stages and to the ADRs/agent specs. Not a generic diagram.
- Learner Model = a new read module over existing tables. No new state.
- Evaluation Lab = the `/eval` data path, extended with case details and a "Benchmark not yet run" state.

Scenario demos ("Teach me", "Check if I learned", "What should I revise") must run the real pipeline. No canned answers.

## 5. Database changes

Proposed (minimal, reviewed before writing):

1. `profiles.ai_showcase_access boolean not null default false`. Protected by a trigger in the same pattern as 0023: only `service_role` may change it. Students cannot self-grant.
2. Payload-only additions: `conceptId` on `concept_explained` and `learning_plan_created`. No table change.
3. Optional, later: `eval_runs.version_label text`, `eval_runs.model text`.

No new tables are needed for Phases A–C.

## 6. Security model

**Authorization is server-side, based on a stored capability, not email.**

- Capability: `profiles.ai_showcase_access`, read from the session's own profile row (existing self-read RLS). Set only by a service-role script, the same way `create-demo-accounts.mjs` works.
- Every `/api/showcase/*` route: `getClaims()`, then read the capability, then return 403 if false. The check is repeated in each route, not only in the page layout.
- The `/explorer` and showcase pages get the same check. A signed-in student who guesses the URL gets a redirect or 403, with no data.
- Showcase data reads are RLS-scoped to the signed-in account. The showcase only needs the demo account's own rows, so the service-role key is not used in request paths.
- No secret, API key, env value, prompt text, or raw model reasoning is returned. Payloads are rebuilt through an allowlist before they reach the client, as `voice/events` already does.
- Recruiter access (Phase G) is a separate decision. See the "Access" section below.

**Decision needed — current exposure.** Today, every student:

- sees the Architecture Explorer in the header (`/explorer`), and
- can open the AI Transparency Panel on any reply in chat, which shows latency, tokens, and cost.

The brief says normal students must not see traces, cost, or latency. This conflicts with the current build. Options:

- (a) Gate `/explorer` and the Transparency Panel behind `ai_showcase_access`. Students lose a feature they can see today. Recommended.
- (b) Keep both for all students and state that the Transparency Panel is a deliberate learner feature. Requires your product sign-off.

## 7. Phased implementation plan

Each phase: typecheck, lint, tests, production build, security review, secret scan, live verification where relevant. Separate commit per phase, only on your instruction.

- **Phase A — Authorization and shell.** Migration for `ai_showcase_access` + trigger; capability check helper; `/explorer` and showcase shell gated; 403 tests for each route; decision on current exposure (6a/6b).
- **Phase B — AI Flight Recorder.** Timeline view from existing trace data; voice stages joined by `voiceTraceId`; "Not currently instrumented" for missing stages; no new events.
- **Phase C — Learner Model.** Read module over `learner_concept_mastery`, events, `concept_relationships`; "why this next" built from real fields; `conceptId` payload fix first.
- **Phase D — Evaluation Lab.** Extend `/eval` data path; case-level detail; "Benchmark not yet run" when empty; version fields only after review.
- **Phase E — Architecture and Performance.** Interactive architecture linked to real traces; p50/p90 only with stated n; cost from existing token fields.
- **Phase F — Experiments and Case Study.** Experiment schema and UI with no fabricated result; case study from `docs/` ADRs, versioned.
- **Phase G — Controlled recruiter access.** Separate design (see below).

## 8. What is real vs. what needs evaluation infrastructure

**Real today:** traces, per-node latency and tokens, per-turn evaluation scores, golden set and `/eval` page, learner mastery, voice timing (browser-side), misconception aggregation, demo account.

**Real after Phase A–C:** Flight Recorder, Learner Model, authorization.

**Needs evaluation infrastructure before any number is shown:** pass rates across versions, routing accuracy, planning appropriateness, hallucination rate, misconception-handling quality, A/B experiment results, p90 under load, cost per successful learning outcome. Show "Benchmark not yet run" until real runs exist.

## 9. Access for recruiters (Phase G, not for approval now)

Not for implementation until the following are discussed. Current state: `/demo` signs visitors into one shared account, bounded by a 30-message daily cap.

Risks to discuss before any change:

- **Abuse:** a shared public session can be used by anyone, including to ask the model unrelated questions.
- **Anthropic cost:** one daily cap is shared across all visitors. Per-visitor caps are not in place.
- **Tavus usage:** free tier allows one concurrent conversation. A second visitor is refused.
- **Muse usage:** per-instance limiter only, not shared across instances.
- **Session isolation:** one shared account means shared history and learner state.
- **Demo-state reset:** no reset exists. Seeded data and visitor messages accumulate.
- **Rate limits:** current limiters are in memory per instance, so they are not shared across Vercel instances.

Options to evaluate: a server-created temporary demo user per visit (with TTL cleanup), or a magic link to a read-only showcase snapshot. Recommendation: a read-only, pre-recorded trace snapshot for recruiters, and no open chat, until the abuse and cost limits are shared-storage based.

## 10. Risks

- **Exposure of internals to students** (section 6). Highest product risk; needs your decision.
- **Stale or thin data** for the Learner Model and Patterns, with few real samples. Mitigation: sample-size labels and hidden-below-threshold states.
- **Overclaiming.** Retention is a recency heuristic, not a forgetting-curve model. It must be labelled as such. Same for the revision-review time estimate.
- **Raw payload view.** The `raw` toggle exposes stored payloads. Review each event type before the showcase shows raw data.
- **Duplicate surfaces.** `/explorer`, the Transparency Panel, `/eval`, and the showcase overlap. Consolidate in Phase A rather than adding a fourth.
- **Shared-state limits** (section 9).

## Decisions needed from you

1. Current exposure of `/explorer` and the Transparency Panel to all students: gate them (6a) or keep them (6b).
2. Approve the `profiles.ai_showcase_access` column and service-role-only trigger (section 5).
3. Confirm the Phase order (A → G) and that Phase G is discussed separately.

---

## Phase A — implementation status

Implemented in code (not committed):

- **Capability:** `profiles.ai_showcase_access boolean not null default false` (`web/supabase/migrations/0028_showcase_access.sql`). A trigger rejects changes from user sessions (anon/authenticated JWT). Changes from service_role or a direct database session (SQL Editor) are allowed.
- **Server check:** `web/src/lib/showcase/showcase-access.ts`. Reads the caller's own profile row through their RLS-scoped session, keyed by the verified JWT subject. Only the boolean `true` grants access. Fails closed.
- **Gated surfaces:** `/showcase/*` (layout: sign-in redirect when signed out, 404 when not authorized), `/explorer` (redirects to `/showcase/flight-recorder`, so it inherits the gate), `GET /api/observability/recent` and `GET /api/observability/trace/[traceId]` (401 signed out, 403 not authorized), `/dev-brief` (404 when not authorized), the chat and AI Tutor transparency controls and panel, and the Dev Brief nav item.
- **Reused:** the Architecture Explorer view moved to `web/src/components/showcase/ExplorerView.tsx` and is the Flight Recorder page. The AI Transparency Panel is unchanged and is now only rendered for authorized accounts.

Verified so far:

- Typecheck, lint, 307 tests (9 new authorization tests), production build.
- Live run as the demo account before the migration is applied: `/showcase` 404, `/explorer` ends at a 404, `/dev-brief` 404, both trace APIs 403, no Explore link, no Dev Brief nav item, no "How I answered" control, chat renders normally.

Not yet verified (needs the migration applied and the demo flag set):

- The authorized path: showcase shell, Flight Recorder, transparency panel, trace APIs.
- A user session cannot change its own flag (trigger test).
- A second, non-demo student account receives 404/403 everywhere.
