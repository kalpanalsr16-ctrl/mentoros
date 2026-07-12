# M0–M9 Production Verification Sweep

**Status:** ✅ Complete
**Date:** 2026-07-13

---

## Objective

Before defining any milestone beyond the original roadmap, verify the entire agent pipeline (M0–M9) end-to-end against the real staging environment — functionality, database writes, event logging, agent interactions, API behavior, graceful failure handling, and production readiness — and produce a single report the product owner can use to decide whether MentorOS v1's architecture is production-ready.

---

## What Was Verified

Three layers, in order:

1. **Static/build health.** `npm run build` (clean, zero TypeScript errors) and `npm run lint` against the full `web/src` tree.
2. **Regression suite.** All 176 mocked unit assertions built up across M5–M9 (Postgres providers, trigram search, safety filter regression, Concept/Practice/Assessment/Reflection/Memory Agents, Safety/Evaluation/Observability Agents), re-run in this environment via the Node ESM alias-loader harness.
3. **Code-level audit.** `web/src/app/api/chat/route.ts` read in full against every agent spec's documented ordering, gating, and event-emission contract; every RLS policy across all four migrations (`0001_init.sql`–`0004_learner_profile.sql`) read against the two-shape model (`06_Technical_Architecture.md`) plus the `events` table's documented no-SELECT exception; `rate-limit.ts` and `safety-agent.ts` read for fail-open vs. fail-closed behavior.
4. **Live network check.** `GET /api/health` against the real staging Supabase project (unauthenticated, no session needed).
5. **Live authenticated end-to-end pass.** Per this project's established pattern (M0, M1, M5 — scripted test-account creation against shared staging infra is not something this agent does unilaterally), the product owner ran a concrete 8-step checklist against the running dev server, signed in with a real test account: baseline persistence, a Safety Agent block, a fresh-account Concept question (expected to hit the still-Diagnostic fallback path), a Practice request, an Assessment answer submission, a re-ask of the same concept immediately after (the live test of whether Assessment/Reflection/Memory's mastery write actually unlocks the previously-dormant non-Diagnostic Concept Agent branch), rate limiting, and a DB spot-check. **Product owner confirmed the full checklist passed.**

---

## What Passed

| Area | Result |
|---|---|
| Build & lint | ✅ Clean (one pre-existing lint error found and fixed — see below) |
| Regression suite (176 assertions) | ✅ All passing |
| M0 — Foundation | ✅ Live DB connectivity confirmed (`/api/health`); auth, RLS, chat persistence, baseline safety filter all confirmed live by product owner |
| M1 — Context Agent | ✅ Confirmed live (baseline message round-trip) |
| M2 — Router Agent | ✅ Confirmed live (intent classification observed driving both the Diagnostic fallback and the Practice/Assessment branches) |
| M3 — Planning Agent | ✅ Confirmed live (Diagnostic strategy correctly selected pre-mastery; re-evaluated after Assessment) |
| M4 — Personalization Agent | ✅ Wired and gated correctly; product owner's live pass is the first confirmation of a non-default branch actually firing in production, not just tested in isolation |
| M5 — Knowledge Retrieval | ✅ Postgres-backed retrieval + trigram search confirmed via regression suite; concept resolution confirmed live (Practice/Assessment/Concept Agent all require it and fired) |
| M6 — Concept Agent | ✅ Confirmed live, including the "tested but dormant" non-Diagnostic branch, for the first time since M6 was built — unlocked by this same session's M8 mastery write |
| M7 — Practice + Assessment Agents | ✅ Confirmed live end-to-end (structured practice set generated; answer evaluated with structured feedback) |
| M8 — Reflection + Memory Agents | ✅ Confirmed live — the Assessment turn produced a real, persisted mastery update, which is what unlocked M6/M4's dormant branches on the very next turn |
| M9 — Safety Agent | ✅ Confirmed live (unsafe test phrase correctly declined, before Router/Planning/Concept Agent ever ran) |
| M9 — Evaluation Agent | ✅ Verified via regression suite + code audit (internal, not user-visible; runs after every Concept/Practice/Assessment success per the route code) |
| M9 — Observability Agent | ✅ Verified via regression suite + code audit (pure aggregation function, correct by construction; not wired to a live route — see Technical Debt) |
| Rate limiting | ✅ Confirmed live (11th message in a rolling minute rejected) |
| Event logging | ✅ Present at every pipeline branch per code audit (rate_limited, message_received/safety_blocked, intent_detected/routing_failed, learning_plan_created/planning_failed, personalization_profile_created, practice_generated/practice_generation_failed, assessment_completed/assessment_failed, concept_explained/concept_explanation_failed, reflection_completed/reflection_failed, learner_profile_updated, evaluation_completed/evaluation_failed, low_quality_detected, hallucination_detected, llm_call_succeeded/llm_call_failed, reply_sent/safety_reply_sent, message_rejected, reply_failed) |
| Graceful failure handling | ✅ Fail-open confirmed by code for Router/Planning/Personalization/Practice/Assessment/Concept/Reflection/Memory/Evaluation/rate-limit (a transient error degrades to a working fallback, never a raw crash); fail-closed confirmed by code and by design intent for Safety Agent's own Layer 2 failure (the one deliberate exception) |

---

## What Failed

- **One pre-existing lint error**, unrelated to any milestone's active work: `src/lib/supabase/proxy.ts:11` — `let response` flagged by `prefer-const` (never reassigned, only mutated via `.cookies.set()`/`.headers.set()`). **Fixed during this sweep** — zero behavior change, `npm run lint` now clean.
- No functional, architectural, or data-integrity failures were found in the live pass or the code audit beyond the items listed under Technical Debt and Architectural Concerns below.

---

## Remaining Technical Debt

Carried forward from M9-02, still open, not addressed in this sweep (verification found nothing new here beyond confirming these are still accurate):

1. **Incomplete token/cost logging.** Only the M1 fallback path (`llm_call_succeeded`) logs `inputTokens`/`outputTokens`. Concept/Practice/Assessment/Reflection/Evaluation's structured-output calls all discard `response.usage`. This is the explicit subject of the next agreed task (the token-logging housekeeping pass).
2. **Observability Agent has no access path.** `getObservabilityReport()` is correct and tested but requires a service-role client or a new admin RLS policy on `events`, plus an admin auth model — neither exists.
3. **`workflow` inference is a first-pass heuristic**, not a modeled concept.
4. **Dashboards, real-time anomaly detection, and infrastructure metrics** remain entirely unimplemented (need an admin UI, cache layer, queue system, scheduled job — none exist).
5. **Reflection/Memory/Evaluation don't log their own call latency** — only the source agent's latency is captured.

---

## Architectural Concern Found During This Sweep (new)

**The `messages` table's INSERT policy checks conversation ownership only, not `role`.** Per `0001_init.sql`:

```sql
create policy "Students can add messages to their own conversations"
  on public.messages for insert
  with check (
    conversation_id in (select id from public.conversations where student_id = auth.uid())
  );
```

Nothing in RLS stops a student's own authenticated client from inserting a row with `role: 'assistant'` (or `'system'`) directly into their own conversation, bypassing the actual agent pipeline entirely — the API route and a raw Supabase client call are equally privileged at the database layer, since both run as the same authenticated user. Blast radius is currently low (self-only — a student can only corrupt their own conversation history, not another student's), but it does mean a student could fabricate a fake "assistant" turn (e.g., a bogus mastery confirmation, or a planted instruction) that would then feed into `buildConversationContext()` on their next real turn, reaching Router/Planning/Concept/Assessment as if MentorOS had said it. This was not caught by any prior milestone's testing because every prior test drove the pipeline through the real API route, never through a raw client call.

**Recommendation:** add a `check (role != 'assistant' or auth.role() = 'service_role')`-style constraint, or move assistant/system message writes to a service-role-only insert path, before this is treated as fully closed. Flagging as a real, open item — not fixed in this sweep, since it wasn't part of the requested scope and touches an existing, shipped migration.

---

## Deferred Functionality (by explicit product decision, not oversight)

- **Voice Agent** — no spec file; confirmed indefinitely deferred (M9 decision).
- **Constrained Responses** (graduated Medium-risk action, distinct from Block) — explicitly deferred; M9 enforces Allow/Block only, since the routing/prompt-transformation plumbing it needs doesn't exist.
- **Semantic/embedding-based concept retrieval** — M5's trigram search is the shipped interim; revisit once curriculum scale makes trigram's limits a felt problem.
- **Full 11-category Learner Profile Model** (`12_Learner_Profile_Model.md`) — M8 only implements the subset `LearnerState` already models (mastery, weak/strong concepts, confidence, grade, goals, style); emotional signals, achievement system, behaviour analytics, and revision scheduling have no reader anywhere in the pipeline.
- **`10_Observability.md`** (platform-wide observability strategy, distinct from the Observability Agent spec) — still unwritten; confirmed a later task, not a blocker.
- **Age-band granularity** in the Policy Engine's Child Safety category — one open question noted in `11_Policy_Engine.md`, not yet resolved.

---

## Is MentorOS v1 Production-Ready?

**Yes, with two named exceptions that should be tracked, not silently carried:**

- The token-logging gap (Technical Debt #1) means cost/usage observability is incomplete today — not a safety or correctness issue, but a real blind spot for anyone trying to answer "what is this costing us" before scaling traffic. This is the very next task, already agreed.
- The `messages` RLS role-integrity gap (new finding above) is a real, if low-blast-radius, data-integrity hole that should be closed before this pipeline is trusted with more consequential downstream decisions (e.g., if a future milestone ever uses conversation history for anything higher-stakes than teaching context).

Every other dimension checked — safety gating and its fail-closed posture, RLS-based per-student isolation, event logging coverage, graceful degradation, and the full agent pipeline's live behavior including the previously-dormant M4/M6 branches — held up under both static audit and a live authenticated pass. Nothing found here should block moving to the token-logging pass next, per the agreed sequencing.

---

## Files Modified

- `web/src/lib/supabase/proxy.ts` — `let` → `const` (lint fix, no behavior change).

---

## Next Task

Token-logging housekeeping pass (Open Issue 1 above): add `model`, `inputTokens`, `outputTokens`, `latencyMs`, and estimated cost to every LLM-based agent's event payload — Concept, Practice, Assessment, Reflection, Evaluation, and Router/Safety's own classification calls — so Observability Agent's aggregation is complete rather than partial. Per the product owner's explicit sequencing, no new milestone beyond the original roadmap starts until this is done.
