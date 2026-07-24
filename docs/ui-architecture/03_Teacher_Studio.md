# Teacher Studio

A professional workspace, deliberately denser and more data-forward than the Student Experience (Design Principle 1.6, `docs/design-system/01-Architecture-Design.md`). Twelve modules, specified below.

---

## New schema this experience requires

Named once here, referenced by every module below rather than repeated. **Proposed, not implemented** — this is a documentation deliverable, per this phase's constraints.

| Table | Columns (proposed) | Purpose |
|---|---|---|
| `profiles.role` | new column: `role text default 'student' check (role in ('student','teacher','parent'))` | Distinguishes account types. Defaults to `'student'` so every existing M0–M9 row remains valid without a data migration beyond adding the column. |
| `classes` | `id`, `teacher_id references profiles(id)`, `name`, `grade`, `created_at` | A teacher's roster grouping. |
| `class_students` | `class_id references classes(id)`, `student_id references profiles(id)` | Join table; roster membership. |
| `lesson_plans` | `id`, `teacher_id`, `title`, `grade`, `subject`, `content jsonb`, `source jsonb`, `created_at` | Teacher-authored content. `source` records which `CurriculumProvider` (Postgres/Learning Commons) contributed, per the provenance requirement in the Design System (`docs/design-system/04-UX-Design-Experiences.md` §12.3). |
| `assessments_authored` | `id`, `teacher_id`, `title`, `questions jsonb`, `created_at` | Teacher-authored assessments — distinct from Assessment Agent's per-turn runtime evaluation; this is static content a teacher builds ahead of time. |

**RLS shape (proposed, matching the existing two-shape model in `06_Technical_Architecture.md`):** `classes`/`lesson_plans`/`assessments_authored` use `teacher_id = auth.uid()`, identical in shape to every existing per-owner table. `class_students` needs both a teacher-side policy (`class_id in (select id from classes where teacher_id = auth.uid())`) and a student-side read policy (`student_id = auth.uid()`) so a student can see which classes they're in. **Verification/invite flow for populating `class_students` is explicitly not designed in this document** — see `00_Overview.md`'s Open Flags.

---

## Dashboard — `/studio`

- **Purpose:** Teacher's home base; three clear entry points (Plan a Lesson, Build an Assessment, Explore Curriculum), matching the Design System's wireframe exactly (`docs/design-system/04-UX-Design-Experiences.md` §12.2).
- **Components:** three `Card` action tiles, `StatTile` row (classes, students, recent activity), activity feed list.
- **Permissions:** `role = 'teacher'`.
- **Agent dependencies:** none directly.
- **Future integrations:** Evaluation Platform summary tile (Phase 5).

## Student Overview — `/studio/students/:studentId`

- **Purpose:** Single-student deep dive for a teacher with a verified roster relationship to that student.
- **Components:** `ProgressRing` grid (reused from Student Experience's Progress screen — same pattern, teacher-facing wrapper), `AssessmentFeedbackCard` history, misconception list.
- **Permissions:** `role = 'teacher'` AND a `class_students` row linking this teacher's class to the student.
- **Agent dependencies:** none directly — reads Memory/Assessment Agent output, same tables Student Experience's own Progress/Assessment History screens read, via a teacher-scoped access path.
- **Future integrations:** Intervention Planner deep-link (this module surfaces "suggest an intervention" → `/studio/interventions`).

## Class Overview — `/studio/classes/:classId`

- **Purpose:** Aggregate view of one class's mastery distribution.
- **Components:** `Table` (student × mastery), `StatTile` row (class average, at-risk count), filter controls.
- **Permissions:** `role = 'teacher'` AND `classes.teacher_id = auth.uid()`.
- **Agent dependencies:** none directly.
- **Future integrations:** export to Progress Analytics' longer-range view.

## Lesson Planner — `/studio/lessons`, `/studio/lessons/:lessonId`

- **Purpose:** Author lesson plans, optionally drawing on Learning Commons' curriculum data (standards alignment, learning objectives) per `15_Phase2_Roadmap.md`'s Phase 4 scope.
- **Components:** multi-step authoring flow (outline → detail → review, per the Design System's §12.4), `CurriculumProvider`-sourced reference cards with source attribution badges.
- **Permissions:** `role = 'teacher'`; own lessons only (`lesson_plans.teacher_id = auth.uid()`).
- **Agent dependencies:** a new, teacher-facing generation capability is implied ("lesson planning assistance," per the roadmap's Phase 4 use cases) — **explicitly not the student-facing Concept Agent**, a separate, additive capability with its own prompt/context, not designed in full here (implementation-time work, flagged as a dependency this module has).
- **Future integrations:** AI Lesson Assistant (below) as a conversational front-end to this same authoring flow.

## Assessment Builder — `/studio/assessments`, `/studio/assessments/:assessmentId`

- **Purpose:** Author static assessments ahead of time (distinct from Assessment Agent's live, per-turn evaluation).
- **Components:** question list builder, `CurriculumProvider`-sourced standards-alignment reference.
- **Permissions:** `role = 'teacher'`; own assessments only.
- **Agent dependencies:** same new teacher-facing generation capability as Lesson Planner, for "assessment authoring support" (roadmap's Phase 4 use case) — not the runtime Assessment Agent.
- **Future integrations:** assign a built assessment to a class (needs a distribution/assignment model, not designed here — PRD's own V1 non-goals explicitly exclude a full assignment system; flagged, not built).

## Curriculum Explorer — `/studio/curriculum`

- **Purpose:** Browse both MentorOS's own curriculum and Learning Commons' broader graph, side by side, always source-attributed.
- **Components:** search/filter bar, result cards using the source-attribution pattern (`docs/design-system/04-UX-Design-Experiences.md` §12.3), `Tabs` (MentorOS / Learning Commons).
- **Permissions:** `role = 'teacher'`.
- **Agent dependencies:** none — reads `CurriculumProvider` implementations directly (`PostgresCurriculumProvider`, `LearningCommonsCurriculumProvider`), no agent involved, per the roadmap's own Phase 6 design.
- **Future integrations:** NCERT/Cambridge/IB providers, once built, appear as additional `Tabs` entries — the module's structure doesn't change, only the provider list.

## Learning Commons Integration — `/studio/integrations/learning-commons`

- **Purpose:** Connect and manage the external provider (API key entry, connection status) — configuration, not data browsing (that's Curriculum Explorer's job).
- **Components:** `Input` (API key, masked), connection-status `Badge`, `Button` (test connection).
- **Permissions:** `role = 'teacher'` (or a future admin role — flagged, not resolved: should API-key management be teacher-level or institution-level? Named as an open question for whoever implements this module, not decided here).
- **Agent dependencies:** none.
- **Future integrations:** per-provider connection management as more `CurriculumProvider` implementations are added.

## Misconception Reports — `/studio/misconceptions`

- **Purpose:** Aggregated misconception patterns across a class, surfacing what Assessment Agent has already been capturing per-student (`assessmentReport.misconceptions`) at a class level for the first time.
- **Components:** `Table` (misconception × frequency × affected students), optional Learning Commons misconception-lookup cross-reference (per the roadmap's Phase 4 use case).
- **Permissions:** `role = 'teacher'`; own classes only.
- **Agent dependencies:** none directly — aggregates existing Assessment Agent output (via `events`, self-read-extended to teacher-scoped access — see `10_API_Contracts.md` for the access-control shape).
- **Future integrations:** feed directly into Intervention Planner's suggestions.

## Progress Analytics — `/studio/analytics`

- **Purpose:** Class/cohort-level trend view over time (distinct from Class Overview's point-in-time snapshot).
- **Components:** trend visualization (chart conventions deliberately deferred to whichever phase first ships one, per the Design System §14.1's own scoping note), `StatTile` row, date-range filter.
- **Permissions:** `role = 'teacher'`; own classes only.
- **Agent dependencies:** none directly.
- **Future integrations:** Evaluation Platform (Phase 5) — once AI quality trend reports exist, this module is a natural second consumer of the same underlying reporting infrastructure.

## Intervention Planner — `/studio/interventions`

- **Purpose:** Suggested next actions for struggling students, surfaced from mastery + misconception data.
- **Components:** prioritized `Card` list (student, concept, suggested action), deep links to Student Overview and Homework Generator.
- **Permissions:** `role = 'teacher'`; own classes only.
- **Agent dependencies:** none directly today — a genuinely new "suggest an intervention" capability (rule-based or LLM-assisted) is implied and not designed in full here; flagged as new, teacher-facing, additive logic, explicitly not a modification of Assessment/Reflection Agent.
- **Future integrations:** direct assignment into Homework Generator with the flagged concept pre-selected.

## Homework Generator — `/studio/homework`

- **Purpose:** Generate take-home practice sets for a student or class.
- **Components:** concept/difficulty selector, generated-set preview (reuses `PracticeQuestionCard`), export/print action.
- **Permissions:** `role = 'teacher'`.
- **Agent dependencies:** reuses Practice Agent's existing generation *pattern* (`createPracticeSet`'s injected-function seam) through a new, teacher-facing wrapper — not a call from inside the student pipeline, and not a modification of `practice-agent.ts` itself. The distinction matters: same proven approach, separate invocation path.
- **Future integrations:** Intervention Planner hand-off (above).

## AI Lesson Assistant — `/studio/assistant`

- **Purpose:** Conversational authoring help — a chat-like interface, but for teachers, with entirely different context and purpose than student `/chat`.
- **Components:** reuses `MessageBubble`/`MessageInput` primitives from the Design System's chat pattern set, but a **separate conversation model** — explicitly not the same `conversations`/`messages` tables the student pipeline uses (those are RLS-scoped to student ownership and safety-gated for a child audience; a teacher's authoring conversation is a different data domain entirely). Proposed as its own `teacher_conversations`/`teacher_messages` pair, structurally identical but separate, or a `context` discriminator column — implementation-time decision, flagged here as "same UI shape, separate data domain," not resolved further.
- **Permissions:** `role = 'teacher'`.
- **Agent dependencies:** new, teacher-facing generation capability (same one named under Lesson Planner/Assessment Builder) — one underlying capability, three UI entry points (this module, Lesson Planner, Assessment Builder).
- **Future integrations:** could eventually call `CurriculumProvider` tools directly mid-conversation (a genuine, natural fit for Learning Commons' MCP server, per the roadmap's Phase 6) — named as a future direction, not designed here.
