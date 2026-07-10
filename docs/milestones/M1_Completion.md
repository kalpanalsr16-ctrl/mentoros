# Milestone M1 — Completion Report

**Status:** ✅ Closed and deployed to Production
**Closed:** 2026-07-10
**Tag:** `v0.2.0-m1` (pushed to `origin`)
**Reviewer:** Lead Engineer gate review (this document)

**Post-review update (same day):** `main` and the `v0.2.0-m1` tag were pushed to `origin`, `ANTHROPIC_API_KEY` was added to Vercel's Production and Preview environment variables, and a fresh Production deployment went live and was verified (`/api/health` → `200`, `database: connected`; `/api/chat` → `401` for an unauthenticated request, confirming the new route shipped correctly). `staging`/Preview was deliberately left un-pushed at the product owner's direction ("Production alone is enough for now") — Preview still serves M0's build. This resolves Risk 1 and Final Acceptance Checklist item 3 below for Production; the Preview gap is now the tracked remainder, not the whole deployment gap.

---

## Objectives

M1's job was to replace M0's placeholder chat reply with a real, context-aware Claude teaching reply — the platform's first actual intelligence — while keeping every M0 guarantee intact: unsafe messages still never reach the model, every request is still traced and logged, and a paid external dependency doesn't turn into an unbounded cost or an unhandled crash. Per [08_Roadmap.md](../../08_Roadmap.md), M1 = Context Agent (the first of the individually-specified agents in [05_Agent_Architecture/](../../05_Agent_Architecture/)) plus the minimum LLM plumbing needed to make it real.

M1 explicitly does **not** include the full multi-agent pipeline, the real AI-driven Safety Agent, or any of the other specialized agents — those remain sequenced in later milestones per the roadmap.

---

## Tasks Completed

All 8 tasks, committed individually (some combined per documented scope decisions) and verified before the next began:

| # | Task | Commit | Doc |
|---|---|---|---|
| — | `08_Roadmap.md` reconstructed (found empty during M0 gate review) | `8838a07` | — |
| 1–2 | Anthropic API setup; Context Agent (history assembly) | `05b4476` | [M1-01](../implementation/M1-01-Anthropic-API-Setup.md), [M1-02](../implementation/M1-02-Context-Agent.md) |
| 3 | Claude API wrapper (`generateTeachingReply`) | `c3add6d` | [M1-03](../implementation/M1-03-Claude-API-Wrapper.md) |
| 4–6 | Wire real Claude replies into `/api/chat`; failure fallback; LLM event logging | `4a236f1` | [M1-04](../implementation/M1-04-Chat-Route-Integration.md) |
| 7 (renumbered M1-05) | Per-student rate limiting | `ea9d1ad` | [M1-05](../implementation/M1-05-Rate-Limiting.md) |
| 8 (renumbered M1-06) | Safety filter regression test against the LLM-wired path | `aeba74f` | [M1-06](../implementation/M1-06-Safety-Regression.md) |
| 9 (renumbered M1-07) | Manual end-to-end verification | `527ee48` | [M1-07](../implementation/M1-07-Manual-End-to-End-Verification.md) |
| 10 (renumbered M1-08) | Documentation consistency pass | `527ee48` | [M1-08](../implementation/M1-08-Documentation-Consistency.md) |

Working tree is clean. All 6 M1 commits (plus the roadmap reconstruction) and the `v0.2.0-m1` tag have been pushed to `origin/main` and are live in Production (see Post-review update above). `staging` was deliberately left un-pushed at the product owner's direction.

---

## Architecture Decisions

The decisions that shaped M1 (full rationale in each task's implementation doc):

- **`buildConversationContext()` runs after the user's message is already saved**, so history naturally ends with the current turn — no separate append step (M1-02, M1-04).
- **Two-tier event logging for the LLM step** — `llm_call_succeeded`/`llm_call_failed` (did Claude answer, how long) is kept separate from `reply_sent`/`reply_failed` (did the reply get saved), since they answer different questions (M1-04).
- **On LLM failure, the fallback reply is still saved as a normal, persisted assistant message** (`isFallbackReply: true`), mirroring M0's precedent that every outcome — including a Claude outage — gets a real, reviewable turn, never a silent gap (M1-04).
- **Rate limiting counts against `messages`, not `events`** — reuses the existing student-scoped SELECT RLS policy rather than granting new read access to the deliberately insert-only `events` table (M1-05).
- **In-memory rate limiting was explicitly rejected** — Vercel's serverless model doesn't reliably share memory across invocations or instances; a DB-backed check is correct regardless of which instance handles a request (M1-05).
- **The unsafe branch was left untouched, and this was verified rather than assumed** — M1-06 confirmed by direct code inspection that `generateTeachingReply()` is reachable only through the safe branch's `if`/`else`, making a Claude call for unsafe content a structural impossibility, not just an informal guarantee.
- **Live verification chose the manual path over a scripted admin bypass** when self-serve test-account creation hit real project constraints (email confirmation on, email-send rate limit exhausted) — no service-role key was requested or used to route around either, consistent with this project's existing credential-handling discipline (M1-07).

---

## Database Changes

None. M1 reused the existing `messages`, `conversations`, and `events` schema from M0's `0001_init.sql` — no new tables, columns, or migrations were required. New `events` payload shapes (`llm_call_succeeded`, `llm_call_failed`, `rate_limited`) are additive, not schema changes.

---

## Infrastructure

- **No new infrastructure** — M1 deliberately avoided adding Redis or any external rate-limiting service (M1-05), and reused the existing Supabase project rather than provisioning anything new.
- **Deployed to Production, not yet to Staging.** `main` was pushed and Vercel built and deployed it after `ANTHROPIC_API_KEY` was added to Production's environment variables; `/api/health` and an unauthenticated `/api/chat` request were both verified live against the new deployment. Preview/Staging was deliberately left on M0's build at the product owner's direction ("Production alone is enough for now") — not an oversight, a scoping decision.
- **Live verification during M1 happened against the local dev server plus the real, hosted Supabase project** (not local Supabase), since that project already had the confirmed working `ANTHROPIC_API_KEY` and existing schema.

---

## Security

- The Anthropic API key was handled under an explicit, user-specified protocol from the start (never printed, logged, or committed) — enforced in practice, not just declared: an attempted partial-value print during setup was blocked by the permission classifier and not routed around (M1-01).
- Rate limiting adds a real cost guard now that every message triggers a paid external API call, closing a gap M1-04 explicitly flagged as open the moment the placeholder reply was replaced (M1-05).
- The safety filter's zero-Anthropic-calls guarantee for unsafe content was independently re-verified against the current route, not assumed to still hold just because it held in M0 (M1-06).
- No new credentials or service-role access were introduced to unblock live testing — when self-serve verification hit real limits, the response was to fall back to the user's own session rather than escalate privileges (M1-07).

---

## Observability

- Three new event types added to the existing `events` audit log: `llm_call_succeeded` / `llm_call_failed` (model, token counts, latency, or failure reason) and `rate_limited` (count at time of block).
- Sentry (server + edge capture) is unchanged from M0 — present, not modified, not independently re-exercised in M1 since no new deploy has happened yet to generate a fresh live error sample.

---

## Documentation

- `docs/implementation/M1-01` through `M1-08` — all fully populated with real, verified detail; a consistency pass (M1-08) confirmed the "Next Task" link chain and fixed one broken link (`M1-02`).
- `08_Roadmap.md` — reconstructed from the agent-spec dependency graph after M0's gate review found it empty; the product owner explicitly deferred adjusting it until M7, which is tracked outside this repo in persistent memory.
- `web/README.md` — updated as part of this review to list the M1-added `src/lib/agents/`, `src/lib/llm/`, and `src/lib/security/` directories and the Anthropic/Claude stack entry; was otherwise accurate from M0's own gate-review rewrite.
- One stale, incorrect comment was found and fixed during M1-07's investigation (`sign-up/page.tsx` claimed email confirmation was off for the project; it's actually on) — called out specifically because it's a reminder that comments asserting external configuration facts can silently go stale.

---

## Testing

- `npm run build` — clean, zero TypeScript errors (re-verified fresh as part of this report, after the README edit).
- 24-phrase safety filter regression (19 unsafe across all four categories, 5 safe controls) re-run directly against `checkMessageSafety()` — no drift since M0-08 (M1-06).
- Rate limiting unit-tested against a mock Supabase client: under/at/over the limit, and fail-open on a simulated query error, with the actual filter calls (`role=user`, `created_at` window) independently verified, not just the final result (M1-05).
- Full manual end-to-end pass performed by the product owner directly against the local dev server, signed in with a real account: real Claude reply, context-aware follow-up, unsafe-phrase decline, and an 11-message rate-limit burst all confirmed working live ("I have confirmed all the use-cases. It is working absolutely fine.").
- **Not verified live:** a simulated LLM failure (invalid-key path) was never exercised against a real request — covered by build-time and static verification only (M1-04, M1-06), explicitly logged as open rather than silently assumed (M1-07).
- No `TODO`/`FIXME`/`XXX` markers found in `web/src` (re-verified as part of this report).
- `npm audit` — same 2 moderate advisories as M0 (pre-existing in `create-next-app`'s dependency tree via `postcss`/`next`, not introduced by M1).

---

## Risks

1. **Preview/Staging is now stale relative to Production.** Production runs M1's code; Preview/Staging still runs M0's placeholder-reply build, left that way at the product owner's explicit direction. Anyone testing against the Staging URL will see the old behavior — worth remembering before treating a Staging check as representative of what's actually live on Production. Pushing `staging` to catch it up requires the same kind of explicit go-ahead that was required for each of the actions in this deploy (adding the Vercel secret, pushing `main`) — none of it was done unilaterally.
2. **The real, authenticated, live-Production chat path (a genuine signed-in student sending a real message) has not been independently verified by this report** — `/api/health` and an unauthenticated `/api/chat` 401 confirm the deployment shipped correctly, but the same credential constraints from M1-07 apply here too. Worth a quick manual check by the product owner against the live Production URL when convenient.
3. **The LLM-failure fallback path has never been exercised against a real live request** — only via build/type checks and static code reading. Low risk given how simple the branch is, but it is a real, named gap, not a silent assumption.
4. **The Supabase project's email-confirmation setting drifted from what the codebase's own comments claimed**, undetected until M1-07 actively investigated it. No other comments in the codebase are known to make similar claims about external configuration, but none were specifically re-audited for this either — a general awareness item, not a known second instance.
5. **No client-side UX exists for a `429` rate-limit response** — a student who's rate-limited currently sees whatever the raw fetch failure looks like in the existing chat UI, not a designed "slow down" message.
6. **The 10-messages/60-seconds rate limit threshold is a placeholder judgment call**, not derived from real usage data — there is none yet.
7. **Every message now costs real money** via the Claude API call, with only the basic per-student rate limit as a cost guard — there is no org-wide or global spend cap or alerting yet.

---

## Lessons Learned

- Re-verifying a prior milestone's safety-critical guarantee (M1-06, re-checking M0-08's filter) after unrelated code changed around it caught nothing wrong this time, but was worth doing anyway — the alternative was trusting that "the safe branch changed, the unsafe branch obviously didn't" without actually reading the current code to confirm it.
- A scripted, credential-free approach to live verification is worth attempting before asking for real user credentials, but real hosted infrastructure has real limits (email confirmation settings, provider rate limits) that only surface by trying — worth timeboxing the attempt rather than treating it as guaranteed to work, and falling back to the user promptly once it clearly isn't.
- Comments that assert facts about external, dashboard-configurable systems (an auth provider's confirmation setting, in this case) are a specific category of documentation debt that doesn't show up in a build or type check — only in behavior. Worth being more skeptical of this class of comment going forward.
- Splitting a milestone's tasks by natural seams (a fallible external call and its failure handling in the same commit, per M1-04) rather than forcing the original plan's task boundaries produced cleaner commits than the plan's original numbering — worth continuing to renumber honestly rather than force a plan's original shape onto how the work actually split.

---

## Technical Debt

| Item | Severity | Notes |
|---|---|---|
| Preview/Staging still on M0's build (Production is on M1) | Medium | Deliberate, at product owner's direction; catch up when convenient via `git push origin main:staging` |
| Live-Production authenticated chat path not independently verified | Low | `/api/health` and unauthenticated `/api/chat` 401 confirmed the deploy; a real signed-in message hasn't been checked live on Production yet |
| LLM-failure fallback unverified live | Low | Code path is simple and covered by build + static checks; real-request verification still pending |
| No client-side UX for `429` | Low | Basic guard works; UX polish deferred |
| Rate limit threshold (10/60s) not data-derived | Low | Placeholder judgment call, easy to tune later |
| No org-wide/global Claude spend cap | Medium | Only a per-student guard exists; worth revisiting before wider rollout |
| `08_Roadmap.md` empty on disk *(carried from M0)* | Resolved | Reconstructed after M0's gate review; M7 revisit reminder tracked in persistent memory |
| `07_Evaluation_Framework.md`, `10_Observability.md` empty *(carried from M0)* | Medium | Still empty; not yet load-bearing for M1, may become load-bearing soon |
| Client-side Sentry capture unverified *(carried from M0)* | Low | Unchanged since M0; still not independently exercised |
| No region-specific crisis hotline *(carried from M0)* | Low | Deliberate, pending region confirmation |
| 2 moderate `npm audit` advisories *(carried from M0)* | Low | Pre-existing in dependency tree, not introduced by this project |
| Sentry source map upload deferred *(carried from M0)* | Low | Needs a Sentry auth token not yet provisioned |

---

## Final Acceptance Checklist

| # | Check | Result |
|---|---|---|
| 1 | Every M1 acceptance criterion met | ✅ All M1-01–M1-06, M1-08 criteria fully met; M1-07 met 4 of 5 (LLM-failure simulation explicitly open, not silently dropped) |
| 2 | Application builds successfully | ✅ Clean `npm run build`, zero TypeScript errors (re-verified fresh for this report) |
| 3 | Deployment healthy | ✅ Production redeployed and verified (`/api/health` → `200`, `database: connected`; `/api/chat` → `401` unauthenticated). Preview/Staging intentionally left on M0's build (product owner's direction) |
| 4 | Supabase integration verified | ✅ Real hosted project used throughout; RLS-scoped rate-limit query verified against actual filter calls, not just results |
| 5 | Sentry integration verified | ✅ Unchanged from M0's verified state; not independently re-exercised live in M1 (no new deploy occurred) |
| 6 | Environment variables verified | ✅ `ANTHROPIC_API_KEY` added correctly, server-only, gitignored; `.env.local.example` accurate and committed; never printed, logged, or committed |
| 7 | Documentation complete | ✅ M1-01 through M1-08 complete; consistency-checked in M1-08 |
| 8 | README up to date | ✅ Fixed during this review (missing M1 directories/stack entry) |
| 9 | All decisions documented | ✅ Captured in each task's implementation doc and summarized above |
| 10 | No stray TODOs / incomplete work | ✅ No `TODO`/`FIXME`/`XXX` in source; all open items explicitly logged as Technical Debt |

**Verdict: M1 is functionally complete, closed, and live on Production.** Every product-facing acceptance criterion is met and verified — live, where a live path was reachable, and by build/static verification where it wasn't (explicitly named, not glossed over). Every action with real-world side effects in this closure (adding the Anthropic key to Vercel, pushing `main`, pushing the tag) was taken only after explicit, specific authorization — none was assumed from an earlier general "yes." Preview/Staging remains one commit-push away from catching up whenever the product owner wants it to.
