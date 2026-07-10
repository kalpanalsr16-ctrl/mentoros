# M1-01 — Anthropic API Setup

**Status:** ✅ Completed
**Date:** 2026-07-10

---

## Objective

Provision a real Anthropic API key and get it correctly loaded into the local environment, closing a gap left over from M0: [06_Technical_Architecture.md](../../06_Technical_Architecture.md) states the API key should have been set up in M0 ("low effort, so M1 can start immediately"), but none of M0's 10 tasks actually included it.

---

## Why This Task Exists

Every subsequent M1 task depends on a working, verified Anthropic credential. Doing this first — and verifying it with a real network call, not just "the file has a value in it" — follows the same pattern M0-02 used for Supabase: prove the connection is real before building anything on top of it.

---

## Requirements

- A real Anthropic API account and key, provisioned by the product owner (an API key is a genuine secret; account creation was correctly kept out of automated hands).
- The key added to `.env.local`, server-only (no `NEXT_PUBLIC_` prefix — unlike the Supabase anon key or Sentry DSN, this key has no "safe to expose" property).
- `.env.local.example` updated with a placeholder and sourcing instructions, no real value.
- A real, live connectivity check against the Anthropic API.
- The key never printed to a terminal, never logged, never committed.

---

## Architecture Decisions

- **`ANTHROPIC_API_KEY`, not `NEXT_PUBLIC_ANTHROPIC_API_KEY`.** This is the first secret in the project that must never reach the browser under any circumstance — the two existing `NEXT_PUBLIC_` values (Supabase anon key, Sentry DSN) are both explicitly documented as safe to expose; this one is not, and the naming makes that distinction impossible to miss.
- **Verification via a real, minimal `/v1/messages` call**, not just checking the env var is non-empty — mirrors the M0-02 principle (a "connected" claim is only real if backed by an actual network round trip). Used `max_tokens: 16` and a one-word expected reply to keep verification cost negligible.
- **The user pasted the raw key directly in chat.** Handling it required care beyond the normal `.env.local` workflow: the file-write itself necessarily contains the value once (unavoidable — that's the requested action), but every verification step afterward (presence check, connectivity test) was designed to touch only the key's *length* or a real API response's non-secret fields, never the value or any fragment of it. One attempted verification step (printing an 11-character prefix) was correctly blocked by the permission system as a form of partial credential exposure, and was replaced with a length-only check instead.

---

## Files Created

None.

## Files Modified

- `web/.env.local` (gitignored) — added `ANTHROPIC_API_KEY`.
- `web/.env.local.example` — added a placeholder `ANTHROPIC_API_KEY=` line with sourcing instructions, no real value.

---

## Database Changes

None.

---

## API Changes

None (no application code calls Anthropic yet — that begins in M1-03).

---

## UI Changes

None.

---

## Testing Performed

- Confirmed `web/.env.local` is git-ignored (`git check-ignore -v`) and does not appear in `git status`.
- Confirmed `web/.env.local.example`'s new line has no real value (`grep "^ANTHROPIC_API_KEY=" web/.env.local.example` → empty).
- Sourced `.env.local` in a shell and confirmed `ANTHROPIC_API_KEY` is set (108 characters) without printing the value or any fragment of it.
- Made a real request to `https://api.anthropic.com/v1/messages` (`model: claude-opus-4-8`) using the key: `HTTP 200`, the model replied `"OK"` as instructed, `stop_reason: end_turn`, 4 output tokens.
- Ran `git grep` across all tracked/staged content for the key's prefix pattern (`sk-ant-`) — zero matches, confirming it was never staged or committed at any point.

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| Key added to `.env.local`, server-only | ✅ Met |
| `.env.local.example` updated, no real value | ✅ Met |
| Environment variable verified to load correctly | ✅ Met (length-checked, never printed) |
| Live connectivity test against Anthropic succeeds | ✅ Met (real `200` response) |
| Key never printed to terminal, logs, or docs | ✅ Met |
| Key never committed | ✅ Met (verified via `git grep`) |

---

## Lessons Learned

- "Never print the secret" needs to be enforced at the granularity of *fragments*, not just full values — an 11-character prefix is still a real, if partial, credential exposure, and the permission system correctly treated it as such.

---

## Open Issues

None.

---

## Next Task

[M1-02 — Context Agent](M1-02-Context-Agent.md)
