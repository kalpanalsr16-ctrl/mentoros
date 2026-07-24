# Demo script

A shot-by-shot walkthrough for recording (or live-presenting) a MentorOS demo. Roughly 8–10 minutes at a natural pace. Needs two accounts ready beforehand: one student, one teacher, both signed up in advance so sign-up friction doesn't eat screen time. A parent account and a second student are needed for Act 6 only.

Each beat: **Do** (what to click/type) → **Say** (narration) → **Why it matters** (what it's actually proving, for your own reference — don't read this part aloud).

---

## Act 1 — Open on the thesis (30s)

**Do:** Open the root [`README.md`](../README.md) or the landing page at `/`.
**Say:** "MentorOS is an AI tutoring platform, but the point of this demo isn't the tutoring — it's that every reply comes from a real pipeline of specialized agents, and that pipeline is inspectable, not a black box. I'll show all three roles — student, teacher, parent — and end by opening the actual trace of everything we just did."

---

## Act 2 — Student: a real teaching turn (90s)

**Do:** Sign in as the student account. Land on `/app` (Dashboard). Click into `/chat`.
**Do:** Type: *"Can you help me understand addition without regrouping?"*
**Say (while it streams):** "This is streaming token-by-token, Markdown and LaTeX rendered live. Behind this one reply: a Safety check, an intent classification, a planning decision, a personalization pass, then the actual teaching agent."
**Do:** Once the reply lands, click the message's **"View reasoning"** action.
**Say:** "This is the AI Transparency Panel — off by default, but every message can show you exactly which agents ran, in what order, with real latency and token cost per stage."
**Why it matters:** proves the multi-agent pipeline isn't marketing language — the panel is reading the same `events` rows the pipeline itself wrote, live.

---

## Act 3 — Safety, shown calm (45s)

**Do:** In the same chat, type something that trips the safety filter — e.g. a request clearly outside an academic context (keep it mild and obviously non-harmful for a demo — e.g. asking the assistant to help with something unrelated to schoolwork, or a message from the safety spec's own test categories).
**Say:** "Notice the decline itself — it's styled calm and supportive, never like an error page. That's a deliberate design principle, not an accident: a safety decline shouldn't feel like the product broke."
**Why it matters:** demonstrates the design system's dedicated `safety` message variant (`MessageBubble`), and that Safety runs *before* anything else in the pipeline.

---

## Act 4 — Practice, Assessment, and where the data goes (2 min)

**Do:** Type: *"Can you give me some practice problems on addition without regrouping?"*
**Say:** "Structured practice questions, not flattened text — this is a dedicated Practice Agent, gated on intent classification, not the same agent that just explained the concept."
**Do:** Answer one; let the flow reach an assessment/feedback turn (or explicitly ask to be assessed on the concept).
**Say:** "That mastery score didn't just get shown to me — it was written to the same `learner_concept_mastery` table every other screen in this product reads from."
**Do:** Navigate to `/app/roadmap`, then `/app/progress`, then `/app/assessment` (Assessment History).
**Say:** "One write, five different screens across three roles read it: Progress, the Learning Roadmap, Assessment History, and — coming up — the teacher's Class Overview and Progress Analytics."
**Why it matters:** this is the single strongest "real system, not a demo shell" beat — the same row of data is visibly load-bearing across the whole product.

---

## Act 5 — Teacher Studio: breadth (3 min)

**Do:** Sign in as the teacher account. Land on `/studio`.
**Say:** "Three action tiles, real stats, a real activity feed — this teacher already has a class with your demo student enrolled."
**Do:** Click into **Classes** (`/studio/classes`), open the class, show the roster.
**Do:** Click through, briskly, narrating one line each:
- **Misconception Reports** (`/studio/misconceptions`) — "aggregated across the whole class, not per-student."
- **Progress Analytics** (`/studio/analytics`) — "a trend over a real date range, not a snapshot."
- **Intervention Planner** (`/studio/interventions`) — "who needs attention, and why, prioritized."
- **Lesson Planner** (`/studio/lessons`) — "deliberately manual authoring — no invented AI-generation button where the product spec didn't ask for one."
- **Assessment Builder** (`/studio/assessments`) — same note.
- **Homework Generator** (`/studio/homework`) — "this one *does* call the same Practice Agent pattern from Act 4, through a separate teacher-facing path — reused, not duplicated."
- **Curriculum Explorer** (`/studio/curriculum`) — "browsing MentorOS's own curriculum today; an external standards integration is a planned expansion, not a blocker."
**Do:** Open **AI Lesson Assistant** (`/studio/assistant`). Type: *"Can you suggest one example problem for teaching addition without regrouping?"*
**Say:** "Same chat UI as the student side, but this is a completely separate conversation table underneath — structurally, not just by policy, a teacher's authoring chat can never touch a student's tutoring history."
**Do:** Open **Evaluation Dashboard** (`/studio/evaluation`).
**Say:** "Every interaction this class has had gets scored — groundedness, accuracy, safety — and this is that data, trended, teacher-scoped."
**Why it matters:** this act alone covers 9 of Teacher Studio's 14 shipped modules — the breadth is the point.

---

## Act 6 — Parent Portal: consent-gated, not just RLS (90s)

**Do:** Sign in as the parent account. Send a link request to the second student account.
**Say:** "Right now, this parent has zero access — not a slow page, actual zero rows returned. No policy anywhere in the schema resolves for a pending request."
**Do:** Sign in as that student, go to `/app/parent-requests`, approve it.
**Do:** Sign back in as the parent, refresh `/parent`.
**Say:** "Now, and only now, the dashboard populates — progress, strengths, a recommendation, and the weekly summary, all reading the exact same underlying data the student and teacher views do."
**Why it matters:** the consent gate is the whole story here — show the before/after, not just the after.

---

## Act 7 — The closer: Architecture Explorer (60s)

**Do:** As the teacher (or student), open `/explorer`.
**Say:** "This is every trace from everything we just did, in one place — not a mockup of observability, the actual `events` table this entire demo just wrote to, reconstructed. Click into any one of them."
**Do:** Click into the very first trace from Act 2.
**Say:** "Same reconstruction, same cards, whether you reach it from one message's 'View reasoning' or from this full-page view. One data source, two entry points."
**Why it matters:** ties every earlier act back to one underlying, coherent system — the strongest possible closing beat.

---

## Act 8 — Wrap (20s)

**Say:** "Everything you just saw is shipped and on `main` today. Three things are intentionally scoped as later expansion, not gaps: an external curriculum-standards integration (Learning Commons, blocked only on provisioning a key), voice interaction, and an automated AI-quality regression harness — the live evaluation data you saw in Act 5 already exists; automated drift detection over time is separate, later infrastructure."

---

## If something goes wrong live

- **Safety decline doesn't trigger:** have a second, more clearly test-category phrase ready — don't improvise something that could read as actually inappropriate on camera.
- **Assessment doesn't reach a mastery score in one turn:** it's fine to narrate over a second answer attempt; the point (mastery score → multiple screens) survives a retry.
- **Any screen shows an empty state:** say so plainly — "this class has no data yet" is an honest, correct empty state (see `docs/design-system/05-Motion-And-States.md`), not a bug to hide.
