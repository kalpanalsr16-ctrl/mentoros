# M9-02 — Observability Agent (v1, trace-reconstruction report)

**Status:** ✅ Completed (scoped; see Open Issues for what's deliberately deferred)
**Date:** 2026-07-12

---

## Objective

Add a way to assemble `14_Observability_Agent.md`'s Observability Report shape (trace_id, per-agent latency breakdown, token/cost totals, error count) from data that already exists — the `events` table every agent since M0 has been logging into — rather than building the full spec's dashboards, real-time anomaly detection, or infrastructure metrics, none of which this codebase has the underlying systems for.

---

## Why This Task Exists

Flagged as a natural fast-follow once Evaluation Agent shipped (M9-01) — `14_Observability_Agent.md`'s own Dependencies section names Evaluation Agent as a prerequisite. Not part of M9-01's own scope; picked up immediately after as a separate, smaller pass.

---

## Scope Decision (agreed before implementation)

Checking the full spec against what this codebase actually has surfaced a scope mismatch bigger than any prior milestone's: dashboards (Engineering/AI/Learning/Product) need an admin UI that doesn't exist; cache hit rate/queue lengths/infrastructure health describe a cache layer and queue system MentorOS doesn't have; real-time anomaly detection needs a scheduled job or streaming aggregation, also absent.

What *does* already exist: every event since M0 flows into one `events` table, tagged with `trace_id`, `conversation_id`, `student_id`, and (inconsistently — see Open Issues) latency/token metadata — already a de facto Trace Repository and Event Stream matching the spec's own Trace Model almost exactly. Nothing currently assembles that scattered data back into a single report.

Agreed v1 scope: **one read-only aggregation function**, `getObservabilityReport(supabase, traceId)`, that queries `events` for a trace and reconstructs the spec's Observability Report shape. No new agent call in the request path (every other agent built this session — Safety through Evaluation — is an in-request decision/generation step; Observability Agent is structurally different, a post-hoc read/aggregation concern). No new writes. Dashboards, anomaly detection, and infrastructure metrics explicitly deferred.

---

## Architecture Decisions

- **`buildObservabilityReport(traceId, events)` is a pure function**, separate from the thin `getObservabilityReport(supabase, traceId)` wrapper that queries and calls it — directly unit-testable with hand-built event arrays, no mocked Supabase client needed for the aggregation logic itself.
- **One exhaustive `EVENT_AGENT_MAP`** covers every event name this codebase currently logs (M0–M9), mapping each to the agent/component that produced it. A future event name added without a matching entry here falls into `"Unknown"` — a visible gap in the report, not a silent miscount.
- **`errorCount` counts genuine `*_failed` events only** — `safety_blocked` and `rate_limited` are the system correctly doing its job, not errors, matching the spec's own Outputs example (`"errors": 0` for a normal successful interaction).
- **`workflow` is a first-pass heuristic** inferred from which success event is present (`concept_explained` → "Concept Learning", etc.) — not a formally modeled "session type" anywhere else in this codebase.
- **Cost estimation uses `claude-opus-4-8`'s pricing** ($5/1M input tokens, $25/1M output tokens — the one model `lib/llm/client.ts` calls), hardcoded here rather than imported, to avoid a runtime dependency from this read-only reporting module on the Anthropic SDK.
- **Not wired into a new API route.** `events`' own RLS policy (`0001_init.sql`) intentionally has no SELECT policy at all — "readable via the Supabase dashboard (bypasses RLS) or a future admin surface, not by the student-facing app." `getObservabilityReport()` therefore requires a service-role client or a new admin RLS policy to actually read anything in production; neither exists in this environment, and there's no admin authentication model to gate a new route with either. Built and unit-tested as a library function, ready to wire in once both exist — not stubbed out with a fake auth check as a side effect of this pass.

---

## Files Created

- `web/src/lib/agents/observability-agent.ts` — `EventRow`, `AgentExecutionRecord`, `ObservabilityReport` types; `buildObservabilityReport()` (pure); `getObservabilityReport()`.

## Files Modified

None — this is the first milestone since M5 that didn't touch `route.ts`, since Observability Agent isn't part of the request pipeline.

---

## Database Changes

None. Reads the existing `events` table; no new columns, tables, or event names.

---

## Testing Performed

- **19 unit assertions against `buildObservabilityReport()`** (pure, hand-built event arrays, no mocks): a full successful Concept Learning trace correctly aggregates latency/agent mapping/chronological ordering; a trace with two genuine failures correctly counts `errorCount: 2` and computes token/cost totals exactly against the stated pricing; a safety-blocked trace correctly does *not* count as an error and infers the right workflow; an empty event list produces `totalLatencyMs: null` (no data) rather than `0` (false zero), and `workflow: "Unknown"`; an unrecognized future event name maps to `"Unknown"` rather than throwing.
- Re-ran the full existing suite — M5 (16), M6 (13), M7 (35), M8 (42), M9-01 (47), safety regression (24) — all 177 still passing, confirming this addition disturbed nothing.
- `npm run build` — clean, zero TypeScript errors. `npx eslint` — clean on the new file.
- No `TODO`/`FIXME`/`XXX` markers found in `web/src`.
- Not applicable: no live/dev-server smoke test, since nothing in the request path changed.

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| Observability Report can be reconstructed from existing `events` data | ✅ Met |
| No new agent call added to the request pipeline | ✅ Met — zero changes to `route.ts` |
| Error counting distinguishes genuine failures from legitimate declines | ✅ Met, verified explicitly |
| Aggregation logic is pure and directly testable | ✅ Met |
| Dashboards/anomaly-detection/infra-metrics correctly identified as out of scope, not silently attempted | ✅ Met |
| Clean build | ✅ Met |

---

## Lessons Learned

- Trying to build Observability Agent's cost/token aggregation surfaced a real, pre-existing gap: only `llm_call_succeeded` (M1's fallback path) actually logs `inputTokens`/`outputTokens` in its event payload — none of M6–M9's structured-output calls (Concept/Practice/Assessment/Reflection/Evaluation) capture token usage from `response.usage`, even though the Anthropic SDK returns it on every call. This is exactly the kind of gap an observability pass is supposed to surface — worth a small, separate housekeeping task, not folded into this one.
- Checking `events`' own RLS policy before assuming a "just query the table" function would actually work in production avoided shipping a function that looks callable but would silently return nothing for any non-service-role caller.

---

## Open Issues

1. **Most agents don't log token usage.** Only `llm_call_succeeded` captures `inputTokens`/`outputTokens` today — `totalInputTokens`/`totalOutputTokens`/`estimatedCostUsd` are therefore incomplete for any trace where Concept/Practice/Assessment/Reflection/Evaluation ran instead. Fixing this means touching `lib/llm/client.ts`'s five other structured-output functions to capture and log `response.usage` — a real, contained follow-up, not done here to avoid scope creep into five already-shipped, tested milestones.
2. **Not wired into any API route or admin surface** — needs a service-role client (or a new admin RLS policy on `events`) and an admin authentication model, neither of which exists. The aggregation logic is ready; the access path isn't built.
3. **`workflow` inference is a first-pass heuristic**, not a formally modeled concept — revisit if a real "session type" abstraction is ever needed elsewhere.
4. **Dashboards, real-time anomaly detection, and infrastructure metrics (cache/queue/infra health) remain entirely unimplemented** — all need infrastructure (an admin UI, a cache layer, a queue system, a scheduled job) that doesn't exist in this codebase and wasn't in scope for this pass.
5. **Reflection/Memory/Evaluation's own events don't log their own call latency** (only the *source* agent's latency is logged in `evaluation_completed`, for example) — a smaller version of Open Issue 1, same underlying cause.

---

## Next Task

`08_Roadmap.md`'s originally-planned M0–M9 milestones are now all complete or explicitly scoped-and-deferred (Voice Agent). Next steps are either: (a) the housekeeping pass in Open Issue 1 (token logging across M6–M9's LLM calls), (b) a live authenticated verification pass across M5–M9 (the standing recommendation carried since M8), or (c) a genuinely new milestone the product owner wants to define — not something this roadmap already names.
