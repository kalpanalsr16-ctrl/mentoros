# Milestone M2 — Completion Report

**Status:** ✅ Closed and deployed to Production
**Closed:** 2026-07-10
**Tag:** `v0.3.0-m2` (pushed to `origin`)
**Reviewer:** Lead Engineer gate review (this document)

**Post-review update (same day):** `main` and the `v0.3.0-m2` tag were pushed to `origin` after explicit, specific authorization. Vercel built and deployed the new commit to Production automatically (git-connected); `/api/health` returned `200`/`database: connected` and an unauthenticated `/api/chat` request returned `401`, confirming the deployment shipped correctly. No new Vercel environment variables were required for M2. Preview/Staging was not pushed and remains on M1's build, same carried gap noted in Risks/Technical Debt below.

---

## Objectives

M2's job was to add the Router Agent (05_Agent_Architecture/04_Router_Agent.md): classify learner intent from each message and act on the two things a router can actually do before any downstream agent exists — ask a clarifying question when confidence is low, and log routing metadata for observability — while keeping intent analysis strictly separate from teaching-reply generation, so M6's real Concept Agent can later replace M1's reply step without any change to the Router Agent itself.

M2 explicitly does **not** include Knowledge Retrieval, Personalization, Memory, Planning, Evaluation, or any new database schema — those remain sequenced in later milestones per `08_Roadmap.md`.

---

## Tasks Completed

| # | Task | Commit | Doc |
|---|---|---|---|
| 1 | Router Agent: intent classification, `IntentObject` contract, `/api/chat` wiring | `cd73e8c` | [M2-01](../implementation/M2-01-Router-Agent.md) |

Unlike M0 and M1, M2 was a single cohesive task by design — the full architecture (separation of routing from teaching, the `IntentObject` shape, the injected-classifier testability seam, the configurable confidence threshold) was proposed, reviewed, and revised with the product owner *before* any code was written, so there were no natural seams to split across commits the way M1's tasks were.

Working tree is clean. This commit exists only on local `main`, same starting position M1 was in before its own gate review triggered a push.

---

## Architecture Decisions

Full rationale in [M2-01](../implementation/M2-01-Router-Agent.md); the decisions that most shape later milestones:

- **Router Agent performs intent analysis only, never teaching content** — a product-owner-directed revision of an initial one-combined-call proposal. `classifyIntent()` returns an `IntentObject`; the caller decides whether to fall through to teaching generation. M6 replaces only that one call site.
- **`IntentObject` is a standalone, dependency-free contract** (`lib/agents/intent-object.ts`) — explicitly designed for reuse by Memory, Adaptive Strategy, Knowledge Retrieval, Evaluation, Analytics, and Planning in later milestones, not just Router Agent's own internal use.
- **Two sequential Claude calls per answerable message, not one** — the direct cost of the clean separation above, accepted deliberately rather than optimized away.
- **`classify` is an injected function parameter**, not an internal import — `router-agent.ts` has zero runtime Anthropic SDK dependency, making the confidence-threshold logic unit-testable with a plain mock. Same seam `checkRateLimit()` already used for its Supabase client.
- **Structured output via `client.messages.parse()` + `zodOutputFormat()`** — first use of this pattern in the codebase; required adding `zod` as a new dependency.
- **`ROUTING_CONFIDENCE_THRESHOLD` is a named, exported constant (`0.8`)**, not inlined — tunable later without touching routing logic, per explicit product-owner requirement.
- **Router failure fails open into M1's unchanged behavior** — a routing error never blocks a message; it just logs `routing_failed` and calls `generateTeachingReply()` directly, exactly as M1 did before this milestone existed.

---

## Database Changes

None. Two new `events` payload shapes (`intent_detected`, `routing_failed`) — additive only, same pattern M1 used for `llm_call_succeeded`/`rate_limited`.

---

## Infrastructure

No new infrastructure. No new environment variables — `zod` is a code dependency, not a credential. Not yet deployed (see Risks, carried from M1's own initial closure).

---

## Security

- No new attack surface — routing only runs after the same safety-filter and rate-limit gates M1 established, confirmed unchanged by structural re-inspection of `route.ts`.
- The M1-06 safety regression (24 phrases across all four categories) was re-run and re-verified unaffected; `classifyIntent`/`generateTeachingReply` both remain reachable only from the safe branch of the same single `if`/`else` M0-08 and M1-04 established.
- No new credentials were introduced; `zod` and the Anthropic SDK's structured-output helper require no new secrets.

---

## Observability

- Two new event types: `intent_detected` (full routing metadata — primary/secondary intent, confidence, topic, subtopic, clarification flag, model) and `routing_failed` (failure reason). Both additive to the existing `events` table.
- The terminal `reply_sent` event gained an `isClarification` flag, mirroring the `isFallbackReply` precedent from M1-04, so a reply's outcome is identifiable without cross-referencing the `intent_detected` event.

---

## Documentation

- `docs/implementation/M2-01-Router-Agent.md` — full detail on the design, the architecture revision the product owner requested (and why it was accepted as-is rather than optimized), and all testing performed.
- `web/README.md` — updated to reflect the Router Agent, the `intent-object.ts` contract, and `zod` in the stack.
- Two known gaps were surfaced during M2 planning rather than silently resolved: no Curriculum/Topic taxonomy document exists yet (topic/subtopic stay free text), and the Router spec's <150ms latency target is incompatible with an LLM-based contextual classifier. Both are logged as open, not solved.

---

## Testing

- 15 unit-test assertions against `router-agent.ts`'s real source, using a mocked classification function: high-confidence single-intent, multi-intent (secondary preserved), low-confidence with and without a model-provided clarification question, the exact threshold boundary, and failure propagation.
- 5 live calls against the real Claude structured-output endpoint (`classifyIntentWithClaude`), covering clear Learning/Practice/Assessment requests, a genuine multi-intent message, and an ambiguous message that correctly produced a low-confidence classification with a real clarification question — the first live proof this codebase's `messages.parse()` + `zodOutputFormat` usage actually works, not just that it type-checks.
- Safety regression (24 phrases) re-run and passing; structural re-verification that the unsafe branch still cannot reach either Claude call.
- `npm run build` — clean, zero TypeScript errors (re-verified fresh for this report, after the README edit).
- Dev server smoke test — unauthenticated `/api/chat` still returns `401`.
- No `TODO`/`FIXME`/`XXX` markers found in `web/src`.
- `npm audit` — same 2 moderate advisories as M0/M1 (pre-existing, not introduced by M2).

---

## Risks

1. **Preview/Staging is now two milestones stale relative to Production.** Production runs M2's code; Preview/Staging still runs M1's build (itself never caught up after M1's own deploy). Anyone testing against the Staging URL will see neither the Claude integration's latest state nor the Router Agent. Catching it up is a one-command fast-forward whenever wanted, but needs the same explicit go-ahead as any push in this project.
2. **The real, authenticated, live-Production routing path has not been independently verified by this report** — `/api/health` and an unauthenticated `/api/chat` 401 confirm the deployment shipped correctly, but a genuine signed-in student triggering real classification on Production hasn't been checked (same credential constraints noted in M1-07).
3. **Two Claude calls per answerable message** now live in the design permanently (classify, then reply) — a deliberate, agreed cost/latency trade-off, worth monitoring once real usage exists.
4. **No curriculum/topic taxonomy exists** — becomes load-bearing once M3 (Planning Agent) needs the Curriculum Graph the roadmap already flags as missing, and again at M5 (Knowledge Retrieval).
5. **The Router spec's <150ms latency target is not met and isn't realistically achievable** with the current LLM-based approach — documented as accepted, not solved.
6. **`secondaryIntent` is detected and logged but never acted on** — correct for this milestone's scope, but worth remembering nothing downstream consumes it yet.

---

## Lessons Learned

- Presenting an initial technical proposal (one combined Claude call) and having the product owner explicitly reject it in favor of a cleaner separation produced a better long-term interface than the original proposal would have — worth continuing to present trade-offs plainly rather than defaulting to the locally cheaper option.
- A dependency-injection seam added purely for unit-testability (`classify` as a parameter) turned out to be the same change needed for the architectural goal (Router Agent shouldn't know how classification happens) — testability and clean architecture aligned rather than trading off against each other here.
- Checking a live model's classification against the spec's own written category definitions caught that an illustrative example from the planning conversation ("quiz me" → secondary intent `Practice`) was actually less accurate than what the model produced (`Assessment`, which the spec explicitly lists under that category) — real output cross-checked against the source spec beats a hand-written example when they disagree.

---

## Technical Debt

| Item | Severity | Notes |
|---|---|---|
| Preview/Staging two milestones behind Production | Medium | Deliberate, at product owner's direction; catch up via `git push origin main:staging` when wanted |
| Live-Production authenticated routing path not independently verified | Low | Same credential constraints as M1-07; health + unauthenticated-401 confirmed the deploy shipped |
| Two Claude calls per answerable message | Medium | Deliberate trade-off for clean separation; revisit if cost becomes a real constraint |
| No curriculum/topic taxonomy document | Medium | Becomes load-bearing at M3 and M5 |
| Router latency target (<150ms) not met | Low | Spec-vs-reality tension, documented as accepted |
| `secondaryIntent` unused downstream | Low | By design this milestone |
| *(carried from M0/M1)* `07_Evaluation_Framework.md`, `10_Observability.md` empty | Medium | Still empty |
| *(carried from M0/M1)* Client-side Sentry capture unverified | Low | Unchanged |
| *(carried from M0/M1)* No region-specific crisis hotline | Low | Deliberate, pending region confirmation |
| *(carried from M0/M1)* 2 moderate `npm audit` advisories | Low | Pre-existing, not introduced by this project |

---

## Final Acceptance Checklist

| # | Check | Result |
|---|---|---|
| 1 | Every M2 acceptance criterion met | ✅ All 10 criteria in M2-01 met, verified live and by unit test |
| 2 | Application builds successfully | ✅ Clean `npm run build`, zero TypeScript errors (re-verified fresh) |
| 3 | Deployment healthy | ✅ Production redeployed and verified (`/api/health` → `200`, `database: connected`; `/api/chat` → `401` unauthenticated). Preview/Staging intentionally left behind (product owner's direction) |
| 4 | Supabase integration verified | ✅ Unchanged from M1; no new schema or query patterns introduced |
| 5 | Sentry integration verified | ✅ Unchanged from M1; not independently re-exercised (no new deploy) |
| 6 | Environment variables verified | ✅ No new environment variables required for M2 |
| 7 | Documentation complete | ✅ M2-01 complete; README updated |
| 8 | README up to date | ✅ Fixed during this review (Router Agent, `zod`) |
| 9 | All decisions documented | ✅ Captured in M2-01 and summarized above |
| 10 | No stray TODOs / incomplete work | ✅ No `TODO`/`FIXME`/`XXX` in source |

**Verdict: M2 is functionally complete, closed, and live on Production.** Every acceptance criterion is met and verified — live for the classification call itself, by unit test for the threshold logic, and structurally for the unchanged safety guarantee. `main` and `v0.3.0-m2` were pushed only after explicit, specific authorization, consistent with every prior push and Vercel secret write this project has required. Preview/Staging remains a one-command fast-forward away whenever the product owner wants it caught up.
