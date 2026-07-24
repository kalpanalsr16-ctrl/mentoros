# Student Experience

Ten screens. Each follows the same template so nothing is ambiguous at implementation time. `/chat` is specified in full in `05_Chat_Experience.md`, not duplicated here — this document only places it in context.

**Shared prerequisite, referenced throughout:** several screens below (Practice History, Assessment History) read structured data currently trapped in `events.payload`, which has no SELECT RLS policy for anyone, including the owning student (`0001_init.sql`). This document assumes the same narrow self-read RLS addition already flagged as a prerequisite in `15_Phase2_Roadmap.md`'s Phase 2 (`events` readable where `student_id = auth.uid()`) — not a new decision, just noted everywhere it's load-bearing.

---

## Student Dashboard — `/app`

- **Purpose:** Orientation on sign-in — what to do next, at a glance.
- **Information hierarchy:** (1) a single "continue learning" prompt, (2) mastery snapshot (2–3 concepts), (3) streak, (4) one revision suggestion. Nothing else — Design Principle 1.2 (one idea at a time) applies to the whole page, not just individual cards.
- **Components:** `StatTile` ×2–3, `AchievementBadge` (streak), `Card` (revision suggestion), primary `Button` ("Continue" → `/chat`).
- **API calls:** `GET /api/student/dashboard` (new, aggregates the below).
- **Database tables:** `learner_concept_mastery`, `learner_profiles` (both existing, read-only).
- **Agent dependencies:** none directly — reads Memory Agent's *output*, doesn't call any agent.
- **Empty state:** first-ever sign-in, no mastery data — see `05_Motion-And-States.md` empty-state pattern; copy: "Your progress will show up here after your first few questions," with the Continue button as the sole action.
- **Loading state:** `Skeleton` matching the StatTile/Card layout exactly (design system §19.1).
- **Error state:** dashboard aggregate fails → show Continue button alone (degrade to the one action that always works), per graceful-degradation principle.
- **Future voice integration:** a "Talk to MentorOS" entry point alongside Continue (Phase 7).
- **Future avatar integration:** avatar greeting element above the fold, once an avatar abstraction exists (Phase 7) — no layout reservation needed now, additive.

---

## Learning Roadmap — `/app/roadmap`

- **Purpose:** Visual path through the curriculum — what's done, current, and next.
- **Information hierarchy:** chapter → concept sequence (matches `09_Curriculum_Foundation.md`'s existing hierarchy), current position highlighted, mastered concepts visually distinct from not-yet-covered ones.
- **Components:** a new `RoadmapPath` pattern (sequence of `Badge`-like nodes connected by a line — proposed addition to the Design System's pattern library, not yet in `08_Component_Ownership.md`'s current set), `ProgressRing` per node.
- **API calls:** `GET /api/student/roadmap`.
- **Database tables:** `chapters`, `concepts`, `concept_relationships` (existing, read-only), `learner_concept_mastery` (existing).
- **Agent dependencies:** none directly (reads Knowledge Retrieval's underlying data, doesn't call the agent).
- **Empty state:** curriculum has only one chapter today (NCERT Class 3 Math, per `09_Curriculum_Foundation.md`) — the roadmap should look complete, not sparse, even at this scale; not a defect, a real constraint to design against.
- **Loading state:** `Skeleton` in the roadmap's node-and-line shape.
- **Error state:** falls back to a plain list of concept names if the path-rendering data is incomplete — never a broken/half-drawn path graphic.
- **Future voice integration:** "read my roadmap to me" narration entry point.
- **Future avatar integration:** avatar can stand at the "current position" node as a visual anchor.

---

## Chat — `/chat`

- **Purpose:** The tutoring conversation itself.
- **Full specification:** `05_Chat_Experience.md`. Not duplicated here.

---

## Practice History — `/app/practice`

- **Purpose:** Review past practice sets and how they went.
- **Information hierarchy:** reverse-chronological list of practice sets, each showing concept, difficulty, question count, date.
- **Components:** `Table` (mobile: stacked `Card` list per design system responsive rule), `Badge` (difficulty).
- **API calls:** `GET /api/student/practice-history`.
- **Database tables:** `events` (`practice_generated` rows, via the self-read RLS addition above).
- **Agent dependencies:** none directly — historical read of Practice Agent's past output.
- **Empty state:** "You haven't done any practice yet. Ask MentorOS for practice questions to get started." + link to `/chat`.
- **Loading state:** `Skeleton` table rows.
- **Error state:** "Couldn't load your practice history right now" + retry button (design system §20.2 pattern).
- **Future voice integration:** none specific — this is a review surface, not a live interaction.
- **Future avatar integration:** none.

---

## Assessment History — `/app/assessment`

- **Purpose:** Review past assessment feedback and mastery trend.
- **Information hierarchy:** reverse-chronological list, each entry showing concept, mastery score, status, date; tapping expands misconceptions/feedback.
- **Components:** `AssessmentFeedbackCard` (reused directly from the Design System's pattern library — same component chat renders inline).
- **API calls:** `GET /api/student/assessment-history`.
- **Database tables:** `events` (`assessment_completed` rows, self-read RLS).
- **Agent dependencies:** none directly — historical read of Assessment Agent's past output.
- **Empty state:** "No assessments yet. Ask MentorOS to test you on something." + link to `/chat`.
- **Loading state:** `Skeleton` matching `AssessmentFeedbackCard`'s shape.
- **Error state:** same pattern as Practice History.
- **Future voice integration:** none specific.
- **Future avatar integration:** none.

---

## Progress — `/app/progress`

- **Purpose:** Mastery-by-concept view — the canonical "how am I doing" screen.
- **Information hierarchy:** per-concept mastery (ring + percentage), grouped by chapter, weak concepts surfaced first (reusing the derived-at-read-time weak/strong split M8's `PostgresLearnerStateProvider` already computes).
- **Components:** `ProgressRing` (per concept), `Card` (grouping), `Badge` (weak/strong label).
- **API calls:** `GET /api/student/progress`.
- **Database tables:** `learner_concept_mastery` (existing, read-only) — same source `LearnerStateProvider` already reads for the live pipeline; this screen is a second reader of the same data, not a new write path.
- **Agent dependencies:** none directly.
- **Empty state:** same as Dashboard's — "Your progress will show up here after your first few questions."
- **Loading state:** `Skeleton` ring grid.
- **Error state:** design system §20.2 pattern; retry only, no partial/stale data shown silently.
- **Future voice integration:** "how am I doing in math?" spoken query routed here.
- **Future avatar integration:** avatar reaction tied to mastery trend (encouraging, never negative, per Design Principle 1.4).

---

## Revision Planner — `/app/revision`

- **Purpose:** What to revisit and when.
- **Information hierarchy:** due-now items first, upcoming items after, each tied to a specific weak concept.
- **Components:** `Card` list, `Button` ("Revise now" → `/chat` pre-seeded with the concept).
- **API calls:** `GET /api/student/revision`.
- **Database tables:** **new** `revision_schedule` table (proposed: `student_id`, `concept_id`, `due_at`, `frequency`, `created_at`) — this is genuinely new scheduling logic, flagged in `15_Phase2_Roadmap.md` as needing its own scoping; this document specifies the *screen and data shape* only, not the scheduling algorithm itself.
- **Agent dependencies:** none today; a future scheduling job (not an agent in the M0–M9 sense) would populate `revision_schedule` — out of scope for this document, named as a dependency this screen has on work not yet designed.
- **Empty state:** "Nothing due for revision right now — keep learning and this will fill in." (a genuinely positive empty state, not a placeholder-feeling one).
- **Loading state:** `Skeleton` card list.
- **Error state:** design system §20.2 pattern.
- **Future voice integration:** "what should I revise today?" spoken query.
- **Future avatar integration:** none specific.

---

## Achievements — `/app/achievements`

- **Purpose:** Streaks and milestones, celebrated per Design Principle 1.5 (reward consistency, never speed/pressure).
- **Information hierarchy:** current streak (largest element), then a grid of earned milestones, chronological.
- **Components:** `AchievementBadge` (uses `duration-celebratory` motion on first view only, per design system §17.3), grid layout.
- **API calls:** `GET /api/student/achievements`.
- **Database tables:** **new** `achievements_earned` table (proposed: `student_id`, `achievement_type`, `earned_at`, `metadata jsonb`) — a persisted historical record, deliberately not purely derived at read time (Design Principle: once earned, an achievement shouldn't disappear if underlying mastery later dips). Streak count itself *is* derived at read time from `messages.created_at` grouped by day — no new table needed for that part.
- **Agent dependencies:** none — a future lightweight rule ("student completed an assessment above 80% → award badge X") is application logic, not an agent, and not designed in this document.
- **Empty state:** "Your first achievement is one question away." + link to `/chat` — deliberately upbeat, not a bare "no achievements."
- **Loading state:** `Skeleton` grid.
- **Error state:** design system §20.2 pattern.
- **Future voice integration:** achievement announcements could be spoken on unlock (Phase 7).
- **Future avatar integration:** avatar celebration animation tied to `duration-celebratory` (Phase 7).

---

## Profile — `/app/profile`

- **Purpose:** Grade, goals, learning style — the exact inputs Personalization Agent already consumes but today has no UI to collect (`06_Personalization_Agent.md`'s existing inputs, unfed).
- **Information hierarchy:** grade (single-select), goals (multi-select chips), learning style preference — matches the Design System's onboarding wireframe (`docs/design-system/04-UX-Design-Experiences.md` §11.2) exactly, since this screen is that same flow's persistent, editable form.
- **Components:** `Select`, `Chip`/`Badge` (multi-select), `Button` (save).
- **API calls:** `GET /api/student/profile`, `PATCH /api/student/profile`.
- **Database tables:** `learner_profiles` (existing, read/write — same table Memory Agent already writes to; this is a second, student-initiated writer of the *preference* fields only, never the *mastery* fields, which stay exclusively Memory Agent's).
- **Agent dependencies:** none directly — Personalization Agent reads this data on the next chat turn, unchanged.
- **Empty state:** not applicable (form always renders; unset fields show as unset, not as an empty-state pattern).
- **Loading state:** `Skeleton` form fields.
- **Error state:** save failure → inline banner, form retains entered values (never silently discards input on error).
- **Future voice integration:** voice-based onboarding as an alternative to typing (Phase 7).
- **Future avatar integration:** none specific.

---

## Settings — `/app/settings`

- **Purpose:** Account-level preferences (email, password, notifications once they exist) — distinct from Profile's *learning* preferences.
- **Information hierarchy:** account section, then notification preferences (future, named not built).
- **Components:** `Input`, `Button`, `Toggle` (future).
- **API calls:** uses Supabase Auth's existing client-side methods directly (no new MentorOS API needed for account fields it doesn't own).
- **Database tables:** `profiles`, `auth.users` (both existing).
- **Agent dependencies:** none.
- **Empty state:** not applicable.
- **Loading state:** `Skeleton` form fields.
- **Error state:** inline, per-field, matching Supabase Auth's existing error surface conventions from `/sign-in`/`/sign-up`.
- **Future voice integration:** none.
- **Future avatar integration:** none.
