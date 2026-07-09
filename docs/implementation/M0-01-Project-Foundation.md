# M0-01 — Project Foundation

**Status:** ✅ Completed
**Date:** 2026-07-09

---

## Objective

Stand up an empty, working Next.js + TypeScript application that runs locally and proves both the page-rendering path and the server-side API path work in one codebase — before any real feature (accounts, database, chat) is built on top of it.

---

## Why This Task Exists

Per [08_Roadmap.md](../../08_Roadmap.md), Milestone M0 exists to build the platform's ground floor before any teaching intelligence exists. Per [06_Technical_Architecture.md](../../06_Technical_Architecture.md) Decision 1 ("One Codebase, Not Many Services"), the frontend (what the student sees) and backend (server-side logic) are meant to live in a single Next.js application rather than as separate services. This task is the smallest possible proof that decision actually works — a page that renders, and an API route that responds — before anything real is layered on top.

---

## Requirements

- A Next.js + TypeScript application, runnable locally.
- A placeholder home page (not the framework's default starter content).
- A working server-side API route, proving the "one codebase" decision holds.
- Zero TypeScript errors on build.
- Local version control initialized.

---

## Architecture Decisions

- **Node.js via `nvm`, not Homebrew.** The build machine had no Node.js, Homebrew, or MacPorts installed. `nvm` (Node Version Manager) was chosen over a direct Node installer because it requires no `sudo`, is fully reversible (delete `~/.nvm` and remove a few lines from the shell profile), and is the setup path assumed by most Node/Next.js tutorials. Installed Node v24.18.0 (LTS) and npm 11.16.0. `nvm`'s install script needed a shell profile to attach to; none existed, so `~/.zshrc` was created.
- **App scaffolded into `web/`, not the repository root.** `create-next-app` refuses to scaffold into a non-empty directory, and the repo root already holds the product's Markdown documentation. A dedicated `web/` subfolder keeps documentation and application code cleanly separated. Tradeoff: Vercel will need its "Root Directory" project setting pointed at `web/` later (deferred to M0-10).
- **npm as the package manager**, matching [06_Technical_Architecture.md](../../06_Technical_Architecture.md)'s "boring, mainstream" principle — no Yarn/pnpm decision to explain or maintain.
- **No Tailwind CSS.** Not part of any architecture decision made so far; adding it now would be an undiscussed dependency. Plain CSS was used for the placeholder page instead.
- **`src/` directory layout enabled**, keeping all Next.js internals (`app/`, etc.) contained under `web/src/` rather than mixed with `web/`'s own config files.
- **Git initialized at the repository root**, not inside `web/`, so the product documentation and the application code share one version history rather than being split across two repositories.

---

## Files Created

- `web/` — full Next.js project scaffold via `create-next-app@latest` (TypeScript, App Router, ESLint, `src/` layout, import alias `@/*`, Turbopack, no Tailwind), including `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `web/.gitignore`, `public/*.svg`
- `web/src/app/api/health/route.ts` — new health-check route
- `/.gitignore` — root-level ignore file (`.DS_Store`, editor folders, env files)

## Files Modified

- `web/src/app/page.tsx` — replaced the default `create-next-app` starter content (Next.js logo, "Deploy Now" / "Documentation" links) with a minimal centered "MentorOS — Coming soon." placeholder
- `web/src/app/layout.tsx` — updated `metadata.title` and `metadata.description` from the generator defaults to "MentorOS"
- Removed `web/src/app/page.module.css` (no longer imported once the default page content was replaced)

---

## Database Changes

None. No database exists yet (introduced in M0-02 / M0-03).

---

## API Changes

- `GET /api/health` — added. Returns `{ status: "ok", timestamp }`. At the end of this task it had no database awareness; that was added in M0-02, when Supabase connectivity checking was layered into the same route.

---

## UI Changes

- Home page (`/`) replaced with a placeholder: centered "MentorOS" heading and "Coming soon." subtext. No interactivity, no routing beyond the default `/`.

---

## Testing Performed

- `npm install` — completed with no errors (343 packages; 2 moderate `npm audit` advisories noted, not addressed — pre-existing in the framework's own dependency tree, not something introduced here).
- `npm run build` — compiled successfully in ~2.4s, TypeScript check passed with zero errors, both routes recognized (`/` static, `/api/health` dynamic).
- Dev server started on a local test port; `curl` against `/` returned HTTP 200 with the expected `<h1>MentorOS</h1>` heading present in the response body.
- `curl` against `/api/health` returned HTTP 200 with valid JSON: `{"status":"ok","timestamp":"..."}`.
- Dev server process stopped cleanly after verification; confirmed no leftover process via `ps aux`.

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| `npm install` completes with no errors | ✅ Met |
| `npm run dev` boots without errors | ✅ Met |
| Home page renders at `http://localhost:PORT/` | ✅ Met |
| `/api/health` returns valid JSON | ✅ Met |
| `npm run build` has zero TypeScript errors | ✅ Met |
| Code committed to local git | ✅ Met (commit `bff5a5a`) |

---

## Lessons Learned

- The build machine cannot be assumed to have Node.js, Homebrew, or any package manager pre-installed — environment setup is a real first step, not a formality.
- `create-next-app` requiring an empty target directory directly shaped the decision to use a `web/` subfolder rather than the repository root; this has a small downstream cost (Vercel root-directory configuration) that's worth remembering when M0-10 comes around.
- A file named `CLAUDE.md` unexpectedly appeared at the repository root as real content between sessions (it had been an empty directory during the earlier documentation review). It was read, found consistent with the project's existing direction, and included in the commit as-is without modification.

---

## Open Issues

- ~~Vercel's "Root Directory" setting still needs to be pointed at `web/`~~ — resolved in M0-10.
- ~~The git commit author identity was auto-derived from the local system username/hostname (`kalpanayadav@Kalpanas-MacBook-Air.local`) rather than explicitly configured.~~ Resolved in M0-10 — turned out not to be low priority after all: Vercel silently blocked every deployment over it (the commit author email didn't match anything on the connected GitHub account, which Vercel treats as a spoofing risk). Fixed by setting `git config user.name`/`user.email` to match the real GitHub-linked email.
- Two moderate-severity `npm audit` advisories exist in the dependency tree as scaffolded by `create-next-app`. Not investigated or addressed in this task.

---

## Next Task

[M0-02 — Supabase Connection](M0-02-Supabase-Connection.md)
