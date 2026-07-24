# API Reference

Every route under `web/src/app/api/`, as actually implemented — not the aspirational shape from `docs/ui-architecture/10_API_Contracts.md`, though the two agree everywhere that doc specifies a contract. All routes require a valid Supabase session cookie unless noted; **401** means not signed in, **403** means signed in but not authorized for this specific resource, **404**/**403** are used interchangeably for "not yours" per this codebase's own convention (a nonexistent id and someone else's resource return the identical response, so ownership can never be inferred from the error).

## Core chat

| Route | Auth | Request | Response |
|---|---|---|---|
| `POST /api/chat` | Student | `{ content }` or `{ conversationId, retry: true }` | SSE stream (`state`/`chunk`/`done`/`error` events); final `done` payload includes `conversationId`, `userMessage`, `assistantMessage`, `traceId`, `replyKind`, and (when applicable) `practiceSet`/`assessmentReport`/`masteryUpdate` |

The one route with real streaming and Cancel/Retry semantics — see [diagrams 01–02](../diagrams/) for the full pipeline it drives.

## Observability

| Route | Auth | Request | Response |
|---|---|---|---|
| `GET /api/observability/trace/:traceId` | Self-scoped (student's own traces; teacher-scoped for their students') | — | Reconstructed `TraceView` — per-agent nodes, summary (latency/tokens/cost/errors) |
| `GET /api/observability/recent` | Signed in | `?from=&to=&workflow=&errorsOnly=` | `{ traces: [...] }` — recent traces for Architecture Explorer |

## Student

All student routes are self-scoped — a student only ever reads/writes their own data; `student_id` comes from the session, never a request parameter.

| Route | Request | Response |
|---|---|---|
| `GET /api/student/dashboard` | — | Stat tiles, streak, revision suggestion |
| `GET /api/student/profile` | — | Grade, confidence, learning style, goals |
| `PATCH /api/student/profile` | `{ grade?, confidence?, preferredLearningStyle?, learningGoals? }` (all optional, only sent fields update) | Updated row |
| `GET /api/student/progress` | — | Mastery grouped by chapter |
| `GET /api/student/roadmap` | — | Chapter → concept sequence with `done`/`current`/`next` status |
| `GET /api/student/revision` | — | Concepts due now / upcoming |
| `GET /api/student/practice-history` | — | Past practice sets, by concept |
| `GET /api/student/assessment-history` | — | Past assessment feedback, misconceptions, recommended next step |
| `GET /api/student/achievements` | — | Earned badges + current streak |
| `GET /api/student/parent-requests` | — | Pending parent link requests awaiting this student's decision |
| `POST /api/student/parent-requests/:linkId/approve` | — | Transitions the link to `verified` (see [diagram 04](../diagrams/04-parent-verification.md)) |
| `POST /api/student/parent-requests/:linkId/reject` | — | Transitions the link to `rejected` |
| `POST /api/student/parent-links/:linkId/revoke` | — | A student can revoke a previously-verified link at any time |

## Parent

| Route | Auth | Request | Response |
|---|---|---|---|
| `POST /api/parent/link-request` | Parent | `{ studentId }` | Creates a `pending` row — grants no access on its own |
| `POST /api/parent/links/:linkId/revoke` | Parent | — | Parent-initiated revoke of their own link |

Every other parent-facing read (child progress, achievements, weekly summary) is a server-rendered page reading directly via RLS, not a separate API route — see `web/src/app/parent/`.

## Teacher

All teacher routes require `role = 'teacher'` (`requireTeacher()`) and are class/roster-scoped — a teacher only ever reads/writes data for their own classes and the students in them.

| Route | Request | Response |
|---|---|---|
| `GET /api/teacher/dashboard` | — | Class count, student count, recent activity feed |
| `GET/POST /api/teacher/classes` | POST: `{ name, grade? }` | List of classes / newly created class |
| `GET /api/teacher/classes/:classId` | — | Class overview: roster, per-student mastery, at-risk flags |
| `POST /api/teacher/classes/:classId/students` | `{ studentId }` | Adds a student to the roster |
| `DELETE /api/teacher/classes/:classId/students/:studentId` | — | Removes a student from the roster |
| `GET /api/teacher/students/:studentId` | — | Single-student deep dive (mastery, at-risk, suggested action) |
| `GET/POST /api/teacher/lessons` | POST: `{ title, classId, conceptId?, grade?, subject? }` | List / create a lesson plan (draft) |
| `GET/PATCH/DELETE /api/teacher/lessons/:lessonId` | PATCH: any subset of content fields + `status` | Full lesson plan / updated / deleted |
| `GET/POST /api/teacher/assessments` | POST: `{ title }` | List / create an authored assessment (draft) |
| `GET/PATCH/DELETE /api/teacher/assessments/:assessmentId` | PATCH: `{ title?, questions? }` | Full assessment / updated / deleted |
| `GET /api/teacher/misconceptions` | `?classId=` | Class-wide misconception report, deduplicated across sources |
| `GET /api/teacher/analytics` | `?classId=&range=7d\|30d` | Class average-mastery trend over time, at-risk count |
| `GET /api/teacher/interventions` | `?classId=` | Suggested next actions per struggling student, priority-sorted |
| `POST /api/teacher/homework` | `{ conceptId, difficulty, studentId? \| classId? }` (exactly one target) | Generated practice set (reuses Practice Agent's generation pattern, separate invocation path) |
| `GET /api/teacher/curriculum` | `?source=postgres\|learning-commons&q=` | `{ results: [{ id, name, source, standardCode? }] }` — `learning-commons` returns `501` (not connected yet) rather than a silent empty result |
| `GET /api/teacher/evaluation` | `?classId=&range=&sourceAgent=` | AI-quality trends: per-dimension scores, safety-clean rate, hallucination-risk rate, flagged interactions |
| `POST /api/teacher/assistant` | `{ conversationId?, content }` | AI Lesson Assistant turn — see [diagram 05](../diagrams/05-teacher-assistant.md); response shape mirrors `/api/chat`'s without the streaming |

## Ownership-check pattern, used throughout

Every `:classId`/`:studentId`/`:lessonId`/`:assessmentId`/`:conversationId` route follows the same rule: the underlying table's own RLS SELECT policy already filters to the caller's own rows, so a nonexistent id and someone else's resource produce the identical `403`/`404` response. No route branch ever distinguishes "doesn't exist" from "exists but isn't yours" — that distinction itself would leak information an unauthorized caller shouldn't have.
