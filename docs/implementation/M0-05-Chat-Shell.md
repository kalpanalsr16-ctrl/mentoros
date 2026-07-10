# M0-05 — Chat Shell

**Status:** ✅ Completed
**Date:** 2026-07-09

---

## Objective

Build the protected chat screen's UI shell — message list, input box, header — as local-state-only, with no persistence or backend wiring yet. Isolating the UI from the data layer kept this task small and let the visual/interaction design be checked before any storage logic was added on top.

---

## Why This Task Exists

M0-04 made `/chat` a protected route in principle; this task makes it a real page a signed-in student can actually see and interact with, even before messages are saved anywhere. Splitting "build the screen" from "persist the messages" (M0-06) kept each task independently small and testable, per this project's incremental-milestone philosophy.

---

## Requirements

- `/chat` renders only for a signed-in student (enforced by the M0-04 proxy).
- A message list and a message input, wired to local component state only.
- No backend calls yet — sending a message just updates local state.

---

## Architecture Decisions

- **`/chat/page.tsx` is a Server Component** that reads the signed-in user via `getClaims()` and redirects defensively if no session is present (belt-and-suspenders alongside the M0-04 proxy's route protection, rather than relying on the proxy alone).
- **UI split into three components**: `MessageList` (renders messages), `MessageInput` (text box + send button), `ChatShell` (owns local state, composes the other two) — one responsibility each, consistent with this project's "keep files small, single responsibility" coding principle, and shaped so M0-06 could later swap local state for a real fetch without restructuring the components.

---

## Files Created

- `web/src/app/chat/page.tsx` — protected Server Component; fetches the signed-in user, redirects if absent, renders the chat header and `ChatShell`.
- `web/src/components/chat/MessageList.tsx` — renders a list of messages.
- `web/src/components/chat/MessageInput.tsx` — text input + send button.
- `web/src/components/chat/ChatShell.tsx` — composes `MessageList` + `MessageInput`, owns message state (local-only at this stage).

## Files Modified

None.

---

## Database Changes

None.

---

## API Changes

None.

---

## UI Changes

- New `/chat` page: header + scrollable message list + input box, reachable only when signed in.

---

## Testing Performed

- `npm run build` — zero TypeScript errors.
- Signed in as the test student in a browser, visited `/chat`, sent several messages, confirmed they appeared in the list immediately (local state only — no reload persistence expected or tested at this stage, since that's M0-06's job).
- Signed out and confirmed `/chat` was inaccessible again (re-confirming M0-04's protection still held with the new page in place).

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| `/chat` renders for a signed-in student | ✅ Met |
| `/chat` is inaccessible when signed out | ✅ Met |
| Typing and sending a message updates the visible list | ✅ Met |
| Zero TypeScript errors on build | ✅ Met |

---

## Lessons Learned

- Deliberately building the UI shell before the persistence layer made it possible to verify the interaction design (does sending feel right, does the list render correctly) independently of database/RLS correctness — two different classes of bugs that are easier to isolate separately than together.

---

## Open Issues

None.

---

## Next Task

[M0-06 — Message Persistence](M0-06-Message-Persistence.md)
