# M0-02 — Supabase Connection

**Status:** ✅ Completed
**Date:** 2026-07-09

---

## Objective

Prove the application can talk to a real Supabase project end to end — not just that a client object can be constructed, but that a live network round trip to Supabase succeeds — before any schema or auth work is built on top of it.

---

## Why This Task Exists

Per [06_Technical_Architecture.md](../../06_Technical_Architecture.md), Supabase (Postgres + Auth + Storage) is the platform's single backend. Every later M0 task (schema, auth, chat persistence, event logging) depends on this connection being real and correctly configured. Task 1 proved the "one codebase" shape; this task proves the codebase can actually reach its database.

---

## Requirements

- A Supabase project provisioned and reachable.
- Browser and server Supabase clients wired up per `@supabase/ssr`'s recommended pattern.
- `/api/health` upgraded from a static OK response to a real connectivity check.
- Credentials kept out of git.

---

## Architecture Decisions

- **`@supabase/ssr` over `@supabase/supabase-js` directly**, since the app needs cookie-based sessions to work correctly across Server Components, Route Handlers, and the browser — `@supabase/ssr` is Supabase's documented pattern for exactly this split.
- **Two separate client factories** (`src/lib/supabase/client.ts` for the browser via `createBrowserClient`, `src/lib/supabase/server.ts` for the server via `createServerClient` reading cookies from `next/headers`), rather than one shared client, because the two environments need different cookie-handling strategies and mixing them is a common source of session bugs in Next.js/Supabase integrations.
- **Health check uses a direct `fetch` to `/auth/v1/settings`, not `supabase.auth.getSession()`.** The `getSession()` approach was tried first and found to be a false positive — it reports success even with an invalid anon key because it doesn't make a network call when there's no existing session. Fetching `/auth/v1/settings` with the `apikey` header forces a real round trip: Supabase returns 200 for a valid key and 401 for an invalid one. Verified both cases directly with `curl` before committing to this approach.
- **Env vars follow `NEXT_PUBLIC_` convention** for the URL and anon key since both are safe to expose to the browser (the anon key has no privileges on its own — Row Level Security, added in Task 3, is what actually gates access).

---

## Files Created

- `web/src/lib/supabase/client.ts` — browser Supabase client via `createBrowserClient`.
- `web/src/lib/supabase/server.ts` — server Supabase client via `createServerClient`, reading/writing cookies through `next/headers`.
- `web/.env.local.example` — template documenting `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, with comments on where to find each value in the Supabase dashboard.
- `web/.env.local` (gitignored) — real dev/staging Supabase credentials.

## Files Modified

- `web/src/app/api/health/route.ts` — replaced the static `{status:"ok"}` response with a real Supabase connectivity check (see Architecture Decisions above).
- `web/.gitignore` — added `!.env*.example` exception after the broad `.env*` ignore rule, so the example template can be committed without exposing real credentials.

---

## Database Changes

None. This task proves connectivity only; no tables exist yet (added in M0-03).

---

## API Changes

- `GET /api/health` — now returns `{ status, timestamp, database: "connected" | "error", databaseError? }`, where `database` reflects a real fetch against Supabase's Auth settings endpoint.

---

## UI Changes

None.

---

## Testing Performed

- `curl /api/health` with the real anon key → `200`, `"database":"connected"`.
- Deliberately swapped in an invalid anon key and re-ran the same check → `"database":"error"` with a descriptive `databaseError` message, confirming the check actually distinguishes valid from invalid credentials (closing the false-positive gap found with `getSession()`).
- Confirmed `.env.local` is excluded from `git status` / `git add` and `.env.local.example` is included, verifying the `.gitignore` exception works as intended.

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| App can reach the Supabase project over the network | ✅ Met |
| `/api/health` distinguishes a valid connection from a broken one | ✅ Met |
| Real credentials never committed to git | ✅ Met |
| `.env.local.example` committed as a template | ✅ Met |

---

## Lessons Learned

- A "successful" Supabase client call is not proof of connectivity if the SDK method being called doesn't actually perform a network request for the case being tested. Always verify a health/connectivity check against both a valid and a deliberately invalid credential before trusting it.

---

## Open Issues

None.

---

## Next Task

[M0-03 — Database Schema](M0-03-Database-Schema.md)
