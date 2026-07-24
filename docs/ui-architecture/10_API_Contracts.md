# API Contracts

Every endpoint every new page needs. All are **new and additive** — `/api/chat` and `/api/health` are listed once at the end for completeness and are unchanged by anything in this document, per this phase's constraint against modifying existing APIs.

---

## Contract rules shared by every endpoint below

Stated once here rather than repeated 25 times.

- **Authentication:** every endpoint requires a signed-in session (`supabase.auth.getClaims()`, the same pattern `/api/chat` already uses) plus a role check matching the namespace (`student`/`teacher`/`parent`, per `profiles.role` proposed in `03_Teacher_Studio.md`). Teacher/Parent endpoints additionally require the relevant ownership/link check (`class_students`/`parent_links`) — specified per-domain below where the check differs from a simple `auth.uid()` match.
- **Loading strategy:** every list/detail `GET` follows the same pattern established across `02`–`06`: render a `Skeleton` matching the target content's shape immediately, replace on response — no separate "loading spinner then content pop-in" two-step.
- **Caching assumptions (documented, not implemented):** dashboard/summary endpoints (`*/dashboard`, `*/progress`) are safe to cache client-side for a short window (suggested: 60s) since they reflect data that changes at most once per chat turn, not in real time — the exact caching mechanism (SWR/React Query/manual) is an implementation-time choice, not decided here. Detail/history endpoints (`*/practice-history`, `*/assessment-history`) are not cached beyond the current page view — they're read-once, reviewed, and left. The one endpoint that must **never** be cached: `/api/observability/trace/:traceId` when viewed live during an active chat turn (Architecture Explorer's historical view may cache freely).
- **Error handling:** every endpoint returns `{ error: string }` on failure with an appropriate HTTP status (`401` unauthenticated, `403` unauthorized/no relationship, `404` not found, `500` unexpected) — matching `/api/chat`'s existing error-shape convention exactly, so the frontend has one error-handling pattern across old and new endpoints alike.

---

## Student endpoints

| Method & Path | Used by | Request | Response (shape) |
|---|---|---|---|
| `GET /api/student/dashboard` | `/app` | — | `{ nextAction, masterySnapshot: [{concept, score}], streak: number, revisionSuggestion? }` |
| `GET /api/student/roadmap` | `/app/roadmap` | — | `{ chapters: [{ chapter, concepts: [{concept, status, masteryScore}] }] }` |
| `GET /api/student/practice-history` | `/app/practice` | `?cursor` | `{ items: [{ traceId, concept, difficulty, questionCount, createdAt }], nextCursor }` |
| `GET /api/student/assessment-history` | `/app/assessment` | `?cursor` | `{ items: [AssessmentReport & { createdAt }], nextCursor }` |
| `GET /api/student/progress` | `/app/progress` | — | `{ concepts: [{ concept, chapter, masteryScore, status: 'weak'\|'strong'\|'developing' }] }` |
| `GET /api/student/revision` | `/app/revision` | — | `{ dueNow: [{concept, dueAt}], upcoming: [...] }` |
| `GET /api/student/achievements` | `/app/achievements` | — | `{ streak: number, earned: [{type, earnedAt, metadata}] }` |
| `GET /api/student/profile` | `/app/profile` | — | `{ grade, goals: string[], learningStyle, confidence }` |
| `PATCH /api/student/profile` | `/app/profile` | `{ grade?, goals?, learningStyle? }` | `{ success: true }` or `{ error }` |

## Teacher endpoints

Role check: `role = 'teacher'`. Class/student-scoped endpoints additionally require a `classes.teacher_id = auth.uid()` or `class_students` relationship, per `03_Teacher_Studio.md`'s proposed RLS shape.

| Method & Path | Used by | Request | Response (shape) |
|---|---|---|---|
| `GET /api/teacher/dashboard` | `/studio` | — | `{ classCount, studentCount, recentActivity: [...] }` |
| `GET /api/teacher/classes` | `/studio/classes` | — | `{ classes: [{id, name, grade, studentCount}] }` |
| `POST /api/teacher/classes` | `/studio/classes` | `{ name, grade }` | `{ id, classCode }` |
| `GET /api/teacher/classes/:classId` | `/studio/classes/:classId` | — | `{ name, students: [{id, name, avgMastery, atRisk: boolean}] }` |
| `GET /api/teacher/students/:studentId` | `/studio/students/:studentId` | — | `{ profile, masteryByConcept: [...], recentAssessments: [...], misconceptions: [...] }` — **requires** a `class_students` relationship; `403` otherwise |
| `GET/POST /api/teacher/lessons` | `/studio/lessons` | POST: `{ title, grade, subject, content, source? }` | `{ lessons: [...] }` / `{ id }` |
| `GET/PATCH /api/teacher/lessons/:id` | `/studio/lessons/:id` | PATCH: partial | `{ lesson }` |
| `GET/POST /api/teacher/assessments` | `/studio/assessments` | POST: `{ title, questions }` | `{ assessments: [...] }` / `{ id }` |
| `GET /api/teacher/curriculum` | `/studio/curriculum` | `?source=postgres\|learning-commons&q=` | `{ results: [{ id, name, source, standardCode? }] }` — dispatches to `CurriculumProvider` implementations per the roadmap's Phase 6 design |
| `GET /api/teacher/misconceptions` | `/studio/misconceptions` | `?classId` | `{ misconceptions: [{text, frequency, affectedStudents: [...]}] }` |
| `GET /api/teacher/analytics` | `/studio/analytics` | `?classId&range` | `{ trend: [{date, avgMastery}], atRiskCount }` |
| `GET /api/teacher/interventions` | `/studio/interventions` | `?classId` | `{ suggestions: [{studentId, concept, action}] }` |
| `POST /api/teacher/homework` | `/studio/homework` | `{ studentId? classId?, concept, difficulty }` | `PracticeSet` shape (reused from existing `PracticeAgentResult.response`) |
| `POST /api/teacher/assistant` | `/studio/assistant` | `{ conversationId?, content }` | mirrors `/api/chat`'s response shape, against the separate `teacher_conversations` domain (`03_Teacher_Studio.md`) |
| `GET/PUT /api/teacher/integrations/learning-commons` | `/studio/integrations/learning-commons` | PUT: `{ apiKey }` | `{ connected: boolean, lastChecked }` — API key stored server-side only, never returned in the `GET` response |

## Parent endpoints

Role check: `role = 'parent'` plus a `parent_links` row with `status = 'verified'` for the target `studentId` — every endpoint below enforces this, no exceptions.

| Method & Path | Used by | Request | Response (shape) |
|---|---|---|---|
| `GET /api/parent/dashboard` | `/parent` | — | `{ children: [{studentId, name, weeklySummary: string}] }` |
| `GET /api/parent/children/:studentId` | `/parent/children/:studentId` | — | `{ progress, strengths, weaknesses, recommendation, revisionStatus, achievements }` — an aggregate of the same sources `02_Student_Experience.md`'s own screens read, parent-scoped |
| `POST /api/parent/link-request` | account setup | `{ studentIdentifier }` | `{ status: 'pending' }` — creates the `parent_links` row; **does not** grant access until the (unresolved, see `00_Overview.md`) verification step completes |

## AI Transparency / Observability endpoints

| Method & Path | Used by | Request | Response (shape) |
|---|---|---|---|
| `GET /api/observability/trace/:traceId` | Chat's transparency panel, Architecture Explorer | — | The existing `ObservabilityReport` shape, unchanged (`web/src/lib/agents/observability-agent.ts`) — this endpoint is a thin auth-checked wrapper around the already-built `getObservabilityReport()`, not new aggregation logic. **Requires** the events-table self-read RLS addition already flagged as a Phase 2 prerequisite in `15_Phase2_Roadmap.md`. |
| `GET /api/observability/recent` | Architecture Explorer's trace list | `?range&workflow&errorsOnly` | `{ traces: [{traceId, workflow, createdAt, errorCount}] }` |

## Existing, unchanged

| Method & Path | Notes |
|---|---|
| `POST /api/chat` | Unmodified — every new surface either reads data this route already writes, or calls it exactly as today's `/chat` page does. |
| `GET /api/health` | Unmodified. |
