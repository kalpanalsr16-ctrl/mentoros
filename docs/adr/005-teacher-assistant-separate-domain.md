# ADR-005: The AI Lesson Assistant uses a wholly separate data domain from student chat

**Status:** Accepted
**Source:** [`03_Teacher_Studio.md`](../ui-architecture/03_Teacher_Studio.md) (AI Lesson Assistant section), migration `0022_teacher_conversations.sql`

## Context

The AI Lesson Assistant needs the same UI shape as student chat (a message list, an input box) and reuses `MessageBubble`/`MessageInput` directly. The product doc left the data-model question explicitly open: reuse `conversations`/`messages` with a `context` discriminator column, or build a second, structurally identical pair of tables.

## Decision

Separate tables: `teacher_conversations` / `teacher_messages`, structurally near-identical to `conversations`/`messages` but sharing no table, policy, or code path with them.

## Consequences

- The epic's own acceptance criterion — a teacher cannot read student conversations through this path, and a student cannot read teacher conversations, in either direction — is a *structural* guarantee, not just an RLS policy someone has to get right. There is no shared table for a missing `WHERE` clause or a forgotten policy to leak across.
- A discriminator-column design would have needed every future query against the shared table to remember to filter by context correctly, forever, or risk exactly the leak this design makes structurally impossible.
- Matches this schema's own existing precedent: `assessments_authored` (teacher-authored content) is already a separate table from the runtime `assessment_completed` event data, not a discriminated view over one table — this ADR just names that precedent explicitly for the next person deciding between the two shapes.
- Cost: genuine duplication of table shape and RLS-policy pattern between the two domains. Accepted deliberately — the isolation guarantee is worth more here than DRY-ing two small tables.
