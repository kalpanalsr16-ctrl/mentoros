# M0-06 — Message Persistence

**Status:** ✅ Completed
**Date:** 2026-07-09

---

## Objective

Replace the M0-05 chat shell's local-only state with a real, persisted chat loop: a sent message is saved to the database, gets a saved reply, and both survive a page reload. The reply itself is a deliberately honest placeholder — MentorOS has no real teaching intelligence until M1 — but the save/reply/save/display loop is real end to end.

---

## Why This Task Exists

This is the task that makes M0's core acceptance criterion true: "a test student can sign in and send a message, and the message and a reply are stored." Everything before this (schema, auth, UI shell) exists to make this one loop possible and correctly scoped to the signed-in student via RLS.

---

## Requirements

- Sending a message from `/chat` persists it to the `messages` table under the correct `conversation_id`.
- A reply is generated (placeholder, not real AI) and also persisted.
- Reloading `/chat` shows the same conversation with all prior messages, not a blank slate.
- A returning student resumes their most recent conversation rather than always starting a new one.

---

## Architecture Decisions

- **`POST /api/chat` is a single Route Handler that owns the whole loop**: auth check → ensure a conversation exists (create one if the student has none yet) → save the user message → build and save the reply → return both. Keeping this as one endpoint (rather than separate save/reply endpoints) means the message-and-reply pair is never left half-written from the API consumer's point of view.
- **`buildPlaceholderReply()` is explicit about being a placeholder** in its own returned text ("This is a placeholder reply — MentorOS doesn't have real teaching intelligence yet. That begins in Milestone M1.") — this was a deliberate choice to never let the product silently look smarter than it is, even internally during testing.
- **`/chat/page.tsx` (Server Component) loads the most recent conversation and its messages server-side** before the page renders, rather than fetching client-side after mount — this is what makes reload-persistence actually work: the student sees their history immediately, not after a loading flash.
- **RLS is the enforcement mechanism, not application-level checks** — the Route Handler trusts that `conversations`/`messages` INSERT will simply fail (via RLS) if `activeConversationId` doesn't belong to the requesting student, and returns a 403 in that case, rather than running its own ownership query first. One source of truth for authorization.

---

## Files Created

- `web/src/app/api/chat/route.ts` — `POST` handler: auth check, ensure conversation, save user message, build + save reply, return both.

## Files Modified

- `web/src/app/chat/page.tsx` — now a data-loading Server Component: fetches the signed-in user, loads their most recent conversation and its messages, passes them into `ChatShell` as `initialConversationId` / `initialMessages`.
- `web/src/components/chat/ChatShell.tsx` — accepts `initialConversationId` / `initialMessages` props; sending a message now calls `POST /api/chat` instead of only updating local state.
- `web/src/components/chat/MessageInput.tsx` — added a `disabled` prop to show a "Sending..." state while the request is in flight.

---

## Database Changes

None — uses the `conversations` and `messages` tables created in M0-03.

---

## API Changes

- `POST /api/chat` — added. Request: `{ content: string, conversationId?: string }`. Response: `{ conversationId, userMessage, assistantMessage }` (trace/event fields added in M0-07). Returns 401 if unauthenticated, 400 for empty content, 403/500 if the underlying insert fails.

---

## UI Changes

- Sending a message in `/chat` now shows a real "Sending..." disabled state and the reply appears once persisted, not instantly from local state.
- Reloading `/chat` shows the full prior conversation.

---

## Testing Performed

- Signed in as the test student, sent a message via the UI, reloaded the page, confirmed the message and its placeholder reply both reappeared.
- Ran a standalone Node script using the plain `supabase-js` client, signed in as the real test student, to directly verify: a message insert under that student's own conversation succeeds; an insert under a fabricated/other conversation id is rejected by RLS. This was necessary because cookie-based Next.js Route Handlers can't be exercised realistically with plain `curl` for an authenticated flow.
- Confirmed a brand-new student's first message correctly creates a new conversation (no prior `conversationId` supplied), and a second message in the same session reuses it.

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| Sending a message persists it to `messages` | ✅ Met |
| A reply is generated and persisted | ✅ Met |
| Reloading `/chat` shows the same conversation | ✅ Met |
| A student cannot write into another student's conversation | ✅ Met (verified via script) |

---

## Lessons Learned

- Cookie-based, server-rendered Next.js routes aren't directly `curl`-testable for authenticated flows the way stateless API routes are — a standalone script using the real client SDK, signed in as an actual test user, was the more reliable way to verify RLS behavior end to end.

---

## Open Issues

None.

---

## Next Task

[M0-07 — Event Logging](M0-07-Event-Logging.md)
