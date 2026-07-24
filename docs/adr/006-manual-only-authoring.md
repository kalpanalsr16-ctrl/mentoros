# ADR-006: Lesson Planner and Assessment Builder are manual-only

**Status:** Accepted
**Source:** [`03_Teacher_Studio.md`](../ui-architecture/03_Teacher_Studio.md) (both sections' "Future integrations" notes)

## Context

Both authoring screens could plausibly generate a first draft via an LLM call — the AI Lesson Assistant (ADR-005) demonstrates the underlying capability exists. The product docs frame AI-assisted authoring as a named future integration for both screens, not as part of building the screens themselves.

## Decision

Ship both screens as pure CRUD over their own tables (`lesson_plans`, `assessments_authored`) — a teacher types a title, fills in content fields, saves. No generation button, no AI-drafted starting point, in either screen.

## Consequences

- Two working, testable, low-risk authoring tools ship on a predictable timeline, instead of both being blocked on designing a new generation UX (draft/accept/regenerate flows, content-quality expectations for teacher-facing output) that the docs never specified.
- The AI Lesson Assistant (ADR-005) is explicitly *not* wired into either screen — a teacher can chat with the assistant for ideas and then manually retype/paste into the manual editor, exactly matching the docs' own "Future integrations" framing. Automating that hand-off is a defined, separate, not-yet-scoped task, not an accidental gap.
- Reconsideration trigger: once AI-assisted authoring is actually specified (draft acceptance UX, quality bar, cost model), it's an *addition* to these screens, not a rewrite — the underlying tables and CRUD paths don't need to change to support it.
