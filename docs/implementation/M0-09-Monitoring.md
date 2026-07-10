# M0-09 — Monitoring

**Status:** ✅ Completed
**Date:** 2026-07-09

---

## Objective

Get unhandled errors — server, edge, and browser — automatically captured and visible in Sentry, so a real production failure isn't only discoverable by a student reporting it.

---

## Why This Task Exists

The `events` table (M0-07) captures the application's own expected outcomes; Sentry captures the ones nobody planned for. Both are needed before staging goes live (M0-10) — an error with no signal is invisible until a user complains.

---

## Requirements

- Unhandled errors in server code, edge/proxy code, and browser code are all captured.
- Errors from staging and production are distinguishable from each other in Sentry, not lumped together.
- Setup stays minimal — error capture only, no performance tracing, session replay, or feedback widget, since those go beyond M0's baseline goal.

---

## Architecture Decisions

- **Four separate Sentry init points**, matching `@sentry/nextjs`'s documented convention for this Next.js version: `instrumentation.ts` (server bootstrap), `instrumentation-client.ts` (browser), `sentry.server.config.ts`, `sentry.edge.config.ts` — plus the `onRequestError` hook, rather than a single generic init call.
- **`environment` uses `VERCEL_ENV` (server) / `NEXT_PUBLIC_VERCEL_ENV` (client), not `NODE_ENV`.** This was a self-discovered bug, not a user report: `NODE_ENV` is always `"production"` for any built Next.js app regardless of which Vercel environment it's actually deployed to, which would have made Preview (staging) and Production errors indistinguishable in Sentry. Fixed by threading `VERCEL_ENV` through `next.config.ts`'s `env` block so the browser bundle can see it too (`VERCEL_ENV` itself is server-only by default). Verified against both Vercel's and Next.js's own documentation, not assumption.
- **Source map upload deferred** — it needs a Sentry auth token this milestone doesn't require, and readable stack traces are a nice-to-have, not part of M0's baseline goal ("unhandled errors are automatically captured and visible").

---

## Files Created

- `web/src/instrumentation.ts`, `web/src/instrumentation-client.ts`, `web/src/sentry.server.config.ts`, `web/src/sentry.edge.config.ts` — minimal Sentry init, error capture only.

## Files Modified

- `web/next.config.ts` — added `env: { NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV }` to expose the server-side value to the browser bundle.
- `web/.env.local.example` / `web/.env.local` — added `NEXT_PUBLIC_SENTRY_DSN`.

---

## Database Changes

None.

---

## API Changes

None.

---

## UI Changes

None.

---

## Testing Performed

- Deliberately threw an error inside a server-side API route locally, confirmed it appeared in the Sentry dashboard with the correct `environment` tag.
- Cross-checked `VERCEL_ENV` vs `NODE_ENV` behavior against Vercel's and Next.js's documentation directly, rather than relying on assumption, after noticing the two would otherwise collide.

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| Unhandled server errors are captured in Sentry | ✅ Met (verified) |
| Environment tag distinguishes staging from production | ✅ Met (fixed after self-discovered bug, verified against docs) |
| Setup stays minimal (no tracing/replay/feedback) | ✅ Met |

---

## Lessons Learned

- `NODE_ENV` is not a reliable signal for "which real environment is this" in a deployed Next.js app — it's always `"production"` in any build output. `VERCEL_ENV` (or an equivalent platform-provided variable) is the correct signal, and this is easy to get wrong silently since both environments would otherwise "work," just with misleading data.

---

## Open Issues

- Client-side (browser) error capture was wired up (`instrumentation-client.ts`) but not independently exercised with a real thrown browser error during this task — only the server-side path was directly tested. Same SDK pattern as the verified server path, so risk is judged low, but this should be explicitly tested before relying on it.
- Source map upload (readable stack traces) remains deferred, pending a Sentry auth token.

---

## Next Task

[M0-10 — Staging Deployment](M0-10-Staging-Deployment.md)
