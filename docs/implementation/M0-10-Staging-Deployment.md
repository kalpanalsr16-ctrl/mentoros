# M0-10 — Staging Deployment

**Status:** ✅ Completed
**Date:** 2026-07-09

---

## Objective

Get MentorOS actually deployed and reachable on the internet, with genuinely separate staging and production environments (separate Supabase projects, separate Vercel environment scoping), and verify the full M0 acceptance criteria against the live deployed staging URL — not just against `localhost`.

---

## Why This Task Exists

This is the closing task of M0. Every prior task was verified locally; this one proves the same system survives a real deployment pipeline (git-connected builds, environment-scoped secrets, a real domain) and that "staging" and "production" are actually different environments, not the same database wearing two labels.

---

## Requirements

- Code pushed to a real GitHub repository, connected to Vercel for automatic deployments.
- Two genuinely separate Supabase projects: one for staging (the existing dev project, which already holds test data), one for production (freshly created, empty).
- Environment variables scoped correctly per Vercel environment (Preview → staging Supabase project, Production → production Supabase project).
- The deployed staging URL is reachable by the product owner (not blocked behind a login wall) and passes the full M0 acceptance check manually.

---

## Architecture Decisions

- **Preview environment reused as "staging," rather than a third Vercel environment**, pointed at the original dev Supabase project (which already had real test conversations in it) — Production was pointed at a newly created, empty Supabase project instead of trying to "clean" the dev one, since starting Production from a known-empty state is safer than trusting a manual cleanup pass.
- **Vercel "Root Directory" set to `web/`** — the repository's git root holds product documentation, with the actual Next.js app scaffolded into a `web/` subfolder back in M0-01; Vercel needed to be told the app doesn't live at the repo root.
- **`vercel git connect` via explicit repository URL**, not the bare form — the bare form failed because the CLI was invoked from inside `web/` and doesn't walk up to find the `.git` directory at the actual repo root.
- **Deployment Protection (SSO) disabled for this project**, after explicit confirmation — Vercel's default `*.vercel.app` protection would have put a Vercel-login wall in front of every deployment including Production, which doesn't work for a product whose users (students) have no Vercel accounts. This is a real product requirement, not just a testing convenience, so it was treated as a deliberate security-relevant decision requiring explicit sign-off rather than a default to quietly change.

---

## Files Created

None — this task is infrastructure/configuration, not application code.

## Files Modified

- `docs/implementation/M0-01-Project-Foundation.md` — Open Issues section updated to mark the Vercel Root Directory item and the git-identity item as resolved (see Lessons Learned below for the latter).

---

## Database Changes

- A second, empty Supabase project created for Production (schema from `0001_init.sql` applied there as well). The original dev Supabase project continues to serve as Staging and retains its existing test data.

---

## API Changes

None.

---

## UI Changes

None.

---

## Testing Performed

- `GET /api/health` against both the deployed Production URL and the deployed Preview (staging) URL: both returned `200` with `"database":"connected"`, confirming each environment reaches its own Supabase project over the real network, not just locally.
- Full manual end-to-end pass against the live staging URL, performed by the product owner: signed in with the test account, sent a normal message and confirmed it persisted across a reload, sent an unsafe test phrase and confirmed the safety-decline behavior — all against the actually-deployed app, not localhost. Confirmed working ("It is perfect, looks fine.").
- Verified Production and Preview environment variable scopes independently via `vercel env ls production` / `vercel env ls preview` — each environment has its own `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_SENTRY_DSN` entries.

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| App is deployed and reachable on the internet | ✅ Met |
| Staging and Production are genuinely separate Supabase projects | ✅ Met |
| Staging is not blocked behind a login wall | ✅ Met (SSO protection disabled, explicitly authorized) |
| Full M0 acceptance pass succeeds on live staging | ✅ Met (verified by product owner) |

---

## Lessons Learned

- **The git commit author's email must match the account connected to Vercel**, or Vercel silently blocks the deployment (status stuck at "BLOCKED" with no reason in the CLI's own output — only visible via the dashboard UI). This had been flagged back in M0-01 as a low-priority, non-blocking open issue (commit author auto-derived from the local machine's username/hostname); it turned out to actually block every deployment, including a `staging` branch push that had silently produced no deployment at all earlier in this task, for the same reason. Fixed by setting `git config user.name` / `user.email` to match the GitHub-linked email, then re-committing and re-pushing.
- Direct database connections and CLI-level credential extraction were both explicitly avoided during this task in favor of dashboard-driven configuration where the automated path required weakening a real security control (TLS verification, direct credential-store reads) — see the corresponding decisions logged in M0-03 and this document's Architecture Decisions section.
- Disabling Deployment Protection is a genuine, permanent product-facing security decision (not just a testing toggle) and was treated with the same care as any other security-relevant change — confirmed explicitly before proceeding, not assumed.

---

## Open Issues

- Two moderate-severity `npm audit` advisories remain unaddressed (carried over from M0-01, pre-existing in the framework's dependency tree).
- The staging Supabase project still contains real test data (conversations, messages, events) from verification across all of M0 — expected and harmless for a staging environment, but worth knowing before treating any staging query as representative of a clean slate.
- Client-side Sentry capture on a real deployed environment (as opposed to localhost) has not been independently exercised — see M0-09's Open Issues.

---

## Next Task

This is the final task of Milestone M0. Next: Milestone M1 — see [08_Roadmap.md](../../08_Roadmap.md). **Note:** at the time of M0's completion, this roadmap file was found to be empty on disk (0 bytes) — see the M0 Completion Report for details.
