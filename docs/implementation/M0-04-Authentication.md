# M0-04 — Authentication

**Status:** ✅ Completed
**Date:** 2026-07-09

---

## Objective

Let a student create an account and sign in using Supabase Auth, with a real session that both the browser and the server can see — the identity layer every later task (chat, persistence, event logging) is scoped against via `auth.uid()`.

---

## Why This Task Exists

The RLS policies written in M0-03 are meaningless without a real, working `auth.uid()` on every request. This task closes that gap: a student who signs up gets an auth user (which the M0-03 trigger turns into a `profiles` row), and a student who signs in gets a session the rest of the app can read.

---

## Requirements

- A sign-up page and a sign-in page, both functional against real Supabase Auth (email/password).
- Session available to Server Components and Route Handlers, not just the browser.
- A way to sign out.
- Unauthenticated visitors kept out of the future `/chat` route (route itself built in M0-05, but the protection mechanism belongs here).

---

## Architecture Decisions

- **Sign-up and sign-in pages are Client Components**, since they call `supabase.auth.signUp` / `signInWithPassword` directly from the browser client — no server round trip needed for the auth call itself, and Supabase's JS SDK is built for this pattern.
- **Session/route protection implemented as Next.js 16's `proxy.ts`** (the framework's renamed middleware convention — confirmed via `next/dist/docs`, not assumed from prior training data, since this project's `AGENTS.md` explicitly warns this Next.js version has real breaking changes). `updateSession(request)` refreshes the session cookie and reports whether the visitor is authenticated; the `/chat` path is protected by checking that flag, with a matcher that excludes static assets.
- **`setAll(cookiesToSet, headers)` two-argument cookie-forwarding pattern** used in the proxy, confirmed against Supabase's own `@supabase/ssr` documentation rather than a remembered single-argument form, since getting this wrong silently breaks session refresh.

---

## Files Created

- `web/src/app/sign-up/page.tsx` — email/password sign-up form.
- `web/src/app/sign-in/page.tsx` — email/password sign-in form.
- `web/src/components/SignOutButton.tsx` — Client Component sign-out button.
- `web/src/lib/supabase/proxy.ts` — `updateSession(request)`, returns `{ response, isAuthenticated }`.
- `web/src/proxy.ts` — Next.js 16 proxy (middleware) file; protects `/chat`, matcher excludes static assets.

## Files Modified

- `web/src/app/page.tsx` — added Sign in / Sign up links to the home page.

---

## Database Changes

None (schema already existed from M0-03; this task is the first to actually exercise it via real signups).

---

## API Changes

None — auth calls go through the Supabase SDK directly from the client, not through a custom API route.

---

## UI Changes

- New `/sign-up` and `/sign-in` pages with plain forms (email, password, submit).
- Home page now links to both.

---

## Testing Performed

- Signed up a real test student through the UI; confirmed in the Supabase dashboard that both an `auth.users` row and (via the M0-03 trigger) a matching `profiles` row were created.
- Signed in with the same credentials; confirmed a session cookie was set and persisted across a page reload.
- Attempted to visit `/chat` while signed out; confirmed the proxy redirected away rather than rendering the protected page.
- Signed out via the sign-out button; confirmed the session cookie was cleared and `/chat` became inaccessible again.

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| A student can sign up with email/password | ✅ Met |
| A student can sign in and get a persisted session | ✅ Met |
| Server-side code (not just the browser) can see the session | ✅ Met |
| Signed-out visitors are kept out of `/chat` | ✅ Met |
| A student can sign out | ✅ Met |

---

## Lessons Learned

- This Next.js version's middleware→proxy rename and the exact `setAll` cookie-forwarding signature were both real, non-obvious breaking changes from what training data alone would assume — verifying against the framework's own bundled docs before writing this code avoided a class of silent session bugs.

---

## Open Issues

None.

---

## Next Task

[M0-05 — Chat Shell](M0-05-Chat-Shell.md)
