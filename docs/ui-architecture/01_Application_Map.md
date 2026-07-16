# Application Map

The complete MentorOS site map. `/chat` is preserved exactly at its existing route (a deliberate exception to the `/app/*` namespace below — it's live, working, and renaming it is a route change with no product benefit). Every other new surface is namespaced by audience.

```
Landing (/)
  │
  ├── Sign up (/sign-up)
  ├── Sign in (/sign-in)
  │
  ├── Student App
  │     ├── Dashboard (/app)
  │     ├── Chat (/chat)                    ← existing route, unchanged
  │     ├── Learning Roadmap (/app/roadmap)
  │     ├── Practice History (/app/practice)
  │     ├── Assessment History (/app/assessment)
  │     ├── Progress (/app/progress)
  │     ├── Revision Planner (/app/revision)
  │     ├── Achievements (/app/achievements)
  │     ├── Profile (/app/profile)
  │     └── Settings (/app/settings)
  │
  ├── Teacher Studio (/studio)
  │     ├── Dashboard (/studio)
  │     ├── Classes (/studio/classes)
  │     │     └── Class Overview (/studio/classes/:classId)
  │     ├── Student Overview (/studio/students/:studentId)
  │     ├── Lesson Planner (/studio/lessons, /studio/lessons/:lessonId)
  │     ├── Assessment Builder (/studio/assessments, /studio/assessments/:assessmentId)
  │     ├── Curriculum Explorer (/studio/curriculum)
  │     ├── Misconception Reports (/studio/misconceptions)
  │     ├── Progress Analytics (/studio/analytics)
  │     ├── Intervention Planner (/studio/interventions)
  │     ├── Homework Generator (/studio/homework)
  │     ├── AI Lesson Assistant (/studio/assistant)
  │     ├── Integrations → Learning Commons (/studio/integrations/learning-commons)
  │     └── Settings (/studio/settings)
  │
  ├── Parent Portal (/parent)
  │     ├── Weekly Summary / Dashboard (/parent)
  │     └── Child Detail (/parent/children/:studentId)
  │
  ├── Architecture Explorer (/explorer)         ← standalone deep-dive; embeds the same
  │                                                panel design as 07_AI_Transparency_Panel.md
  │
  └── Admin Console (/admin)                    ← named for completeness; FUTURE, not designed
                                                    in this phase (see 12_Future_Extensibility.md)
```

---

## Page registry

| Page | Purpose | Primary User | Navigation Path | Auth Required | Dependencies | Future Expansion |
|---|---|---|---|---|---|---|
| **Landing** `/` | Public-facing introduction; replaces today's "Coming soon" | Prospective user, showcase reviewer | Entry point | None | — | Marketing sections, screenshots, demo video (Phase 8) |
| **Sign up** `/sign-up` | Account creation | New student (today); new teacher/parent (Phase 2.5/2.6) | From Landing | None | Supabase Auth (existing) | Role selection step once teacher/parent accounts exist |
| **Sign in** `/sign-in` | Authentication | Any returning user | From Landing | None | Supabase Auth (existing) | — |
| **Student Dashboard** `/app` | Student's home base — entry point after sign-in | Student | Post-sign-in redirect; nav | Student | `learner_concept_mastery`, `learner_profiles` (existing) | — |
| **Chat** `/chat` | The tutoring conversation itself | Student | From Dashboard, primary nav | Student | `/api/chat` (existing, unchanged) | Voice mode (Phase 7) |
| **Learning Roadmap** `/app/roadmap` | Visual path through the curriculum | Student | From Dashboard | Student | Curriculum tables (existing), `learner_concept_mastery` | Multi-subject once curriculum expands beyond NCERT Class 3 Math |
| **Practice History** `/app/practice` | Review past practice sets | Student | From Dashboard/Roadmap | Student | `events` (practice_generated rows), new read path | — |
| **Assessment History** `/app/assessment` | Review past assessment feedback | Student | From Dashboard/Roadmap | Student | `events` (assessment_completed rows), new read path | — |
| **Progress** `/app/progress` | Mastery-by-concept view | Student | Primary nav | Student | `learner_concept_mastery` (existing) | — |
| **Revision Planner** `/app/revision` | What to revisit and when | Student | From Progress/Dashboard | Student | New `revision_schedule` table (see `02`) | Spaced-repetition scheduling logic |
| **Achievements** `/app/achievements` | Streaks, milestones | Student | From Dashboard | Student | Derived from `messages`/`learner_concept_mastery` (see `02`) | — |
| **Profile** `/app/profile` | Grade, goals, style (Personalization inputs) | Student | Avatar menu | Student | `learner_profiles` (existing) | — |
| **Settings** `/app/settings` | Account-level preferences | Student | Avatar menu | Student | `profiles` (existing) | — |
| **Studio Dashboard** `/studio` | Teacher's home base | Teacher | Post-sign-in redirect (teacher role) | Teacher | New teacher/class schema (see `03`) | — |
| **Classes** `/studio/classes` | Roster list | Teacher | Studio nav | Teacher | New `classes`/`class_students` tables | — |
| **Class Overview** `/studio/classes/:classId` | Aggregate view of one class | Teacher | From Classes | Teacher | New class schema + `learner_concept_mastery` (existing, read-only) | — |
| **Student Overview** `/studio/students/:studentId` | Single-student deep dive for a teacher | Teacher | From Class Overview | Teacher (must have roster relationship) | `learner_concept_mastery`, `learner_profiles` (existing, read-only via new access path) | — |
| **Lesson Planner** `/studio/lessons` | Author lesson plans | Teacher | Studio nav | Teacher | New `lesson_plans` table, `CurriculumProvider` (Learning Commons/Postgres) | AI Lesson Assistant integration |
| **Assessment Builder** `/studio/assessments` | Author assessments | Teacher | Studio nav | Teacher | New `assessments_authored` table | — |
| **Curriculum Explorer** `/studio/curriculum` | Browse MentorOS + Learning Commons curriculum | Teacher | Studio nav | Teacher | `CurriculumProvider` (both `PostgresCurriculumProvider` and `LearningCommonsCurriculumProvider`) | NCERT/Cambridge/IB providers (Phase 2 roadmap long-term vision) |
| **Misconception Reports** `/studio/misconceptions` | Aggregated misconception patterns across a class | Teacher | Studio nav | Teacher | `events` (assessment_completed misconception data), Learning Commons misconception lookup | — |
| **Progress Analytics** `/studio/analytics` | Class/cohort-level trend view | Teacher | Studio nav | Teacher | `learner_concept_mastery` aggregated (existing, read-only) | Evaluation Platform integration (Phase 5) |
| **Intervention Planner** `/studio/interventions` | Suggested next actions per struggling student | Teacher | From Analytics/Student Overview | Teacher | `learner_concept_mastery`, misconception data | — |
| **Homework Generator** `/studio/homework` | Generate take-home practice sets | Teacher | Studio nav | Teacher | Practice Agent's existing generation pattern, new teacher-facing wrapper | — |
| **AI Lesson Assistant** `/studio/assistant` | Conversational authoring help | Teacher | Studio nav | Teacher | New teacher-facing LLM call (separate from student pipeline) | — |
| **Learning Commons Integration** `/studio/integrations/learning-commons` | Connect/manage the external provider | Teacher (admin-like) | Studio settings | Teacher | `LearningCommonsCurriculumProvider` config (API key) | Additional provider connections (NCERT/Cambridge/IB) |
| **Studio Settings** `/studio/settings` | Teacher account preferences | Teacher | Avatar menu | Teacher | `profiles` (existing) | — |
| **Parent Dashboard** `/parent` | Weekly summary, entry point | Parent | Post-sign-in redirect (parent role) | Parent | New `parent_links` table + read access to linked student's `learner_concept_mastery` | — |
| **Child Detail** `/parent/children/:studentId` | Single-child deep dive | Parent | From Parent Dashboard | Parent (must have verified link) | Same as above | — |
| **Architecture Explorer** `/explorer` | Standalone deep-dive into the multi-agent pipeline | Teacher, technical reviewer | Studio nav; direct link for reviewers | Teacher (see `12` for a possible showcase-mode exception) | `events` via new Observability read route | Showcase/demo mode (Phase 8) |
| **Admin Console** `/admin` | Platform administration | Admin (role doesn't exist yet) | — | Admin (future role) | — | Named only — not designed this phase |

## Route-to-role summary

| Namespace | Role required | Notes |
|---|---|---|
| `/`, `/sign-in`, `/sign-up` | None | Public |
| `/chat`, `/app/*` | Student | Existing `profiles` row, default role |
| `/studio/*` | Teacher | Requires the `role` column proposed in `03_Teacher_Studio.md` |
| `/parent/*` | Parent | Requires the `role` column + a verified `parent_links` row |
| `/explorer` | Teacher (min.) | Read access to `events`, gated by the same role check |
| `/admin` | Admin | Not implemented; named for completeness only |
