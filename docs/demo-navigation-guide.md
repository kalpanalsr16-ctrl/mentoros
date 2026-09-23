# MentorOS — Demo Navigation Guide

Production verified at commit `853d774` (on top of the frozen router-agent fix, `f66c9b6`). Live URL: **https://mentoros-ten.vercel.app**

| Feature | Role | URL | Requires login | Contains real data | Interview ready | Known limitations |
|---|---|---|---|---|---|---|
| Student Chat | Student | `/chat` | Yes | Yes (live Claude API) | Yes | No token-by-token streaming on structured (Assessment/Practice) replies — expected, not a bug. No demo student credentials were created this session (out of scope per your instruction) — use your own existing student login. |
| Student Dashboard | Student | `/app` | Yes | Depends on account history | Yes | Empty-state CTAs vary slightly in wording between subpages (P1, cosmetic). |
| Progress | Student | `/app/progress` | Yes | Depends on account history | Yes | Empty state is missing a "Go to chat" CTA that sibling pages have (P1, deferred). |
| Roadmap | Student | `/app/roadmap` | Yes | Depends on account history | Yes | None beyond general per-account data dependency. |
| Teacher Studio (Dashboard) | Teacher | `/studio` | Yes | **Yes** — real class, stat tiles | Yes | This is now the landing page after teacher login (role-aware redirect). |
| Classes | Teacher | `/studio/classes` | Yes | **Yes** — "Class 3 Mathematics," 1 enrolled student | Yes | Only one student enrolled; adding another requires pasting a raw student UUID (documented product decision, not a bug). |
| Reports | Teacher | `/studio/analytics` | Yes | **Yes** — real trend data for the enrolled student | Yes | Reflects one student only — thin by design, not fabricated. |
| Evaluation Dashboard | Teacher | `/studio/evaluation` | Yes | **Yes** — real `evaluation_completed` events, verified live | Yes | Now in the main sidebar nav (promoted from "More tools"). "Regression alerts" card always shows an honest empty state — that backend doesn't exist yet; mention this proactively if asked. |
| AI Lesson Assistant | Teacher | `/studio/assistant` | Yes | No — no conversation started yet on this account | Needs a live action | Starts blank; type one message live to show it working (real Claude API call, real cost). |
| Student Overview | Teacher (via Class roster link) | `/studio/students/[id]` | Yes | **Yes** — same enrolled student's real history | Yes | No standalone students list — only reachable by clicking the student from Class Overview. |
| Architecture Explorer | Student or Teacher (own history only) | `/explorer` | Yes | **No, for this teacher account** | Not ready as-is | Confirmed: the Teacher Assistant never logs to the trace/events table, and this teacher account has no student-side chat history. Loads fine (200), but will show an empty trace feed. Skip this for the teacher demo, or show it from a student account instead. |
| Misconception Reports | Teacher | `/studio/misconceptions` | Yes | No — this student has no misconception events | Empty state | Loads correctly; genuinely nothing to show for the enrolled student. |
| Interventions | Teacher | `/studio/interventions` | Yes | No — same reason | Empty state | Same as above. |
| Lessons | Teacher | `/studio/lessons` | Yes | No — teacher-authored content | Needs a live action | Always starts empty; create one live if you want to show this. |
| Homework | Teacher | `/studio/homework` | Yes | No — generator, not a data view | Needs a live action | Always starts empty; it's a form, not a dashboard. |
| Assessments | Teacher | `/studio/assessments` | Yes | No — teacher-authored content | Needs a live action | Always starts empty; create one live if you want to show this. |
| Curriculum | Teacher | `/studio/curriculum` | Yes | Yes — global content, not account-scoped | Yes | None. |

All rows above marked "Yes" under **Contains real data** were verified live against production immediately before this guide was written, not assumed from code alone.
