# MentorOS Phase 2 Roadmap — From Engineering-Complete to Showcase-Ready

**Status:** Proposed — awaiting product-owner approval. No implementation has begun.
**Date:** 2026-07-13
**Author role:** Principal Software Engineer / Staff AI Platform Engineer review, per explicit instruction.

**Constraints this roadmap was written under, restated so they're not lost in translation:**
- Do not modify the completed M0–M9 architecture (agent logic, prompts, pipeline ordering, RLS model, event schema).
- Do not optimize latency, cost, prompts, caching, embeddings, or infrastructure.
- Everything proposed below is **additive**: new UI, new read surfaces over existing data, new tables where a genuinely new capability needs one, new agents/integrations that sit alongside the existing pipeline rather than inside it. Nothing here proposes changing how Safety, Router, Planning, Personalization, Concept, Practice, Assessment, Reflection, Memory, or Evaluation currently decide anything.

---

## 0. Executive Summary

MentorOS's engineering is real: a genuine 13-agent pipeline, RLS-correct multi-tenant data model, a two-layer safety gate that fails closed, deterministic evaluation scoring, and a live-verified production deployment. This is not a demo — M0–M9 was checked against a live staging environment, not just unit tests.

But today, if you put this in front of Anthropic, OpenAI, Microsoft, Khan Academy, or Duolingo, the pitch and the product would visibly disagree. The homepage says **"Coming soon."** The chat UI is unstyled system-font `<div>`s with inline styles. There is no way to see the agent pipeline work — Evaluation and Observability Agents produce real data that no human has ever looked at through a UI, because no UI reads it. Two of the four personas the product docs themselves define (Parent, Teacher) have zero implementation. Voice — listed as a core capability in the Vision doc since day one — has never been built. There is no CI pipeline and no committed test suite; every regression check across nine milestones has lived in a scratchpad directory outside the repository.

None of this is a criticism of the engineering — it's the accurate description of a system that was built API-first and inward-out, which was the right call for M0–M9. Phase 2's job is to build outward: make the real engineering visible, give it a second and third audience (parents, teachers) the docs already promised, and close the credibility gaps (tests, CI, a real landing experience) that a technical evaluator from any of those five companies would notice in the first five minutes.

---

## 1. Current Architecture Review

**Stack** (`06_Technical_Architecture.md`): Next.js 16 (App Router, Turbopack) on Vercel, Supabase (Postgres + Auth) via `@supabase/ssr`, Anthropic Claude (`claude-opus-4-8`) via the official SDK with Zod-validated structured outputs, Sentry for error monitoring. No state management library, no UI component library, no CSS framework, no test framework, no CI config exist in the repository today (confirmed: `package.json` has no `jest`/`vitest`/`playwright`; no `.github/workflows/`).

**Backend shape**: one Next.js route handler (`web/src/app/api/chat/route.ts`, ~700 lines) that calls each agent as a plain injected async function, in a fixed linear sequence, inside a single request. This is a deliberate, documented simplification — `06_Technical_Architecture.md`'s own "Decision 2" states MentorOS calls agents "directly, one after another" rather than the event-driven, pub/sub architecture `14_Event_Driven_Architecture.md` describes, and defers a real message broker to a future evidence-driven decision. Every agent is a single Claude API call (two calls for Safety's two-layer gate); no agent currently calls another agent, no supervisor/orchestrator process exists, and no agent reads or writes a shared "state" object the way `13_System_State_Model.md` envisions.

**Data model**: `profiles`, `conversations`, `messages`, `events` (M0); curriculum tables — `subjects`/`grades`/`chapters`/`concepts`/`concept_relationships`/`learning_objectives`/`misconceptions`/`teaching_strategies`/`mastery_criteria` (M5); `learner_profiles`/`learner_concept_mastery` (M8). RLS is real and correct for the two shapes it defines (per-student-owned data; shared read-only reference data), verified live. **One open finding from the Production Verification Sweep, not yet fixed**: the `messages` INSERT policy checks conversation ownership only, not `role` — a student's own client could in principle insert a fabricated `assistant`-role row. Low blast radius, still open.

**A real, undecided documentation conflict** (flagging per `CLAUDE.md`'s "if documentation conflicts internally, stop and ask" rule — this is not resolved below, it's surfaced for a decision): `06_Technical_Architecture.md` §"Monitoring" mandates **Langfuse** for AI-quality observability starting Milestone 1, and explicitly states "building custom dashboards from the raw events table was rejected for now." M9-02 then built exactly that rejected approach — a custom Observability Agent reading the raw `events` table — because at implementation time there was no service-role/admin access path to wire up an external tool, and Langfuse was never integrated in any milestone. Neither doc was reconciled. Phase 2 should not silently pick a side; see §11 and §12.

**Agent fidelity vs. spec** (full 13-agent audit performed for this roadmap): every shipped agent is a deliberately scoped-down v1 of a materially more ambitious spec. The three largest gaps: **Planning Agent's spec describes it as an orchestrator that names which agent runs next**, and no orchestration exists anywhere in the shipped system; **Knowledge Retrieval's spec describes ranked retrieval with citations and confidence-gated retries**, and the shipped version is trigram text search, not grounded retrieval; **Practice Agent's spec describes a stateful, 4-level escalating hint system**, and the shipped version generates a static question set with no hint state machine. Every other agent has a real, individually-documented v1 gap (see `docs/implementation/*.md` for the ones already self-documented, and the full audit performed for this roadmap for the rest). None of this is new debt — it was scoped deliberately, milestone by milestone — but a technical evaluator reading the specs next to the code will find the gap between them wide. That gap is fine to leave as-is; it should not be invisible.

---

## 2. UI/UX Assessment

The entire product surface is four pages (`/`, `/sign-in`, `/sign-up`, `/chat`) and three components (`ChatShell`, `MessageList`, `MessageInput`), all styled with inline `style={}` objects, system fonts (Arial/Helvetica as the CSS fallback, Geist loaded but under-used), and two CSS variables for light/dark. There is no design system, no component library, no spacing/type scale, no icon set, no logo, no brand identity beyond the word "MentorOS." The homepage literally reads **"Coming soon."**

Concretely broken for a showcase context:
- **No markdown/LaTeX rendering.** Concept/Practice/Assessment Agents produce structured output that gets flattened to plain text (`formatTeachingResponseAsReply`, etc.) and rendered as a `white-space: pre-wrap` blob. A math tutor that can't render `\frac{1}{2}` or a numbered step list is a visibly unfinished experience for this audience.
- **No streaming.** The user waits on a spinner-less "Sending..." button for the full non-streaming response (`generateTeachingReply` etc. use `messages.create`/`messages.parse`, not streaming) — every other serious AI product in this space streams tokens.
- **No loading/skeleton states, no message timestamps, no retry-on-error affordance beyond re-typing, no accessibility labels** on the message input (placeholder-only, no `aria-label`), no mobile-specific layout testing evidence.
- **Zero visibility into the agent pipeline.** Safety, Router, Planning, Personalization, Evaluation, and Observability all produce real structured data on every turn — none of it reaches a pixel. For an audience of AI companies specifically, this is the single biggest missed opportunity: the engineering story (multi-agent, safety-gated, self-evaluating) is invisible in the product.

---

## 3. Student Experience Assessment

What exists: sign-up/sign-in, a single persistent chat thread, safety decline messages, structured (but flattened) teaching/practice/assessment replies. What the product's own docs promise and don't exist in any form: an onboarding flow to set grade/goals/style (`04_Learner_Journey.md` "Choose Learning Goal" step — Personalization Agent has no input surface today; its profile is inferred, never asked), a progress/mastery view (the `learner_concept_mastery` table has real per-concept scores nothing displays), a revision/spaced-repetition surface (`12_Learner_Profile_Model.md`'s "Revision Planner" category, explicitly unbuilt), and any achievement/streak/motivation mechanic (`12_Learner_Profile_Model.md`'s "Achievement System" category, explicitly unbuilt; `02_PRD.md` even lists "how should achievements/motivation be designed" as an open question, never answered). A student today has no way to see what they've learned, what they're weak at, or that MentorOS is tracking their progress at all — despite M8 building exactly the data model to support all three.

---

## 4. Teacher Experience Assessment

**Zero implementation, and the docs are explicit that this was always deferred, not forgotten.** `03_User_Personas.md` names Teacher as a persona explicitly labeled "(Future Release)"; `02_PRD.md`'s Non-Goals for V1 explicitly exclude "Teacher-created assignments" and "a full LMS." So this isn't a gap to be embarrassed by — it's a documented future scope. But "showcase to Khan Academy" specifically implies a teacher/institutional story matters for this audience, more than it mattered for M0–M9's scope. There is no `class`/`cohort`/`teacher_student` relationship anywhere in the schema — this is a genuinely new data model, not a UI-only addition, and the right-sized Phase 2 goal is a real but narrow slice (class roster, aggregate mastery view, no assignment/grading system) rather than the full future vision.

---

## 5. Multi-Agent Assessment

The architecture docs describe an event-driven system of 13 independent agents communicating via published events, plus a Planning Agent that acts as a lightweight orchestrator naming which agent runs next. The shipped system is a single hardcoded sequence of function calls in one route handler; "events" are write-only audit-log rows, not messages anything subscribes to. This was the right simplification for M0–M9 (a real event bus is real infrastructure work, correctly deferred per `06_Technical_Architecture.md`'s own reasoning) — and per this roadmap's explicit constraint, **Phase 2 should not change this**. The opportunity in Phase 2 is not to build the event bus, but to make the *existing* linear pipeline's decisions visible after the fact — which is a read-only, additive UI problem, not an architecture problem. See §7 (Evaluation) and §8/§9 below for where this connects to MCP.

---

## 6. Evaluation Framework Assessment

The Evaluation Agent computes a real 6-dimension score (groundedness/accuracy/educationalQuality/personalization/clarity/safety-gated efficiency) on every Concept/Practice/Assessment turn, with a hard safety ceiling — genuinely good, defensible design (`07_Evaluation_Framework.md`). It logs to `events` and nothing else. There is no dashboard, no trend view, no alerting, no human-review workflow, no A/B testing of prompts or strategies — all explicitly named as "Future Enhancements" in `13_Evaluation_Agent.md`'s own spec, so this is a known, intentional gap, not an oversight. For a showcase audience specifically, an Evaluation Framework that scores every interaction but that nobody can ever see the results of is a wasted asset — this is one of the highest-leverage, lowest-risk Phase 2 items (pure read surface, zero architecture change).

---

## 7. Voice & Avatar Readiness

**Voice** is not a stretch idea here — it's core, stated product vision from day one: `01_Vision.md` lists "voice conversations" as a combined capability; `02_PRD.md` has a dedicated Voice Experience section and lists it as a V1 goal ("support both voice and text interactions"). `06_Technical_Architecture.md` only mentions voice once, as a future storage need ("first realistic need is Milestone 8 for voice recordings") — no voice API, STT/TTS vendor, or latency budget was ever decided. `00_Overview.md`'s agent catalog lists a Voice Agent as the very first agent (upstream of Context), and Architecture_Diagram.md draws it as the pipeline's entry node — but **no spec file for it exists**, and M9 explicitly, deliberately deferred it indefinitely. Readiness today: conceptually planned for (the pipeline diagram already has a slot for it), technically unstarted (no vendor decision, no streaming audio handling, no spec).

**Avatar** has no mention anywhere in any of the 16 architecture docs or 15 product docs reviewed for this roadmap — not deferred, not planned, not rejected. It's simply not part of MentorOS's documented vision. Recommend treating it as the lowest-priority, most speculative item in this roadmap (see §13) unless the product owner has a specific reason to add it now.

---

## 8. MCP Integration Opportunities

**Learning Commons, identified 2026-07-13.** A real external platform ([learningcommons.org](https://learningcommons.org/news/claude-for-teachers/)) — "open technological infrastructure" for edtech, notable for being what Anthropic's own "Claude for Teachers" offering runs on. Its Knowledge Graph covers four dataset categories (Academic Standards, Learning Components, Learning Progressions, Curriculum — lessons/activities/assessments), plus misconceptions and learning-science research per its own description, currently populated with all 50 US states' standards and Illustrative Mathematics' IM 360 scope-and-sequence. Two integration paths exist: a REST API (`https://api.learningcommons.org/knowledge-graph/v0`, `x-api-key` header auth) and a native MCP server (`https://kg.mcp.learningcommons.org/mcp`, same auth, exposing three tools — Find Academic Standard Statement, Find Learning Components, Find Learning Progressions).

**One real scoping consideration, not yet resolved, worth flagging now rather than discovering mid-Phase-4:** Learning Commons' current data is US state standards + a US math curriculum (Illustrative Mathematics). MentorOS's own curriculum is NCERT Class 3 Mathematics (India) — the two don't share a standards crosswalk today. This doesn't block Teacher Studio's curriculum-exploration/lesson-planning/assessment-authoring use cases (those draw on Learning Commons' own graph, independent of what MentorOS has stored), but it does mean "standards alignment" between Learning Commons and MentorOS's *own* content isn't automatic — it would need its own mapping layer, out of scope unless separately requested.

Zero mentions of MCP (Model Context Protocol) anywhere in the repository's 31 markdown docs — this is entirely greenfield, and given the stated showcase audience (Anthropic in particular), a well-scoped MCP story is disproportionately valuable relative to its build cost. Two distinct, non-competing directions:

- **MentorOS as an MCP server** (expose read-only capabilities — e.g., "look up a student's mastery on a concept," "fetch this week's practice summary" — as MCP tools). This lets a teacher or parent use MentorOS's data from their own Claude/other MCP-aware client, and lets a Claude-powered admin/ops tool query MentorOS without a bespoke integration. Purely additive: a new, separate API surface reading existing tables, no change to the agent pipeline.
- **MentorOS's own agents as MCP clients** (e.g., Concept Agent could reach a calculator/graphing tool, Practice Agent could reach an OCR tool for photographed handwritten work — directly answering `02_PRD.md`'s "Future Scope: image understanding, handwritten question solving"). This one is explicitly **out of scope for Phase 2** under the "do not modify completed architecture" constraint — it would touch Concept/Practice Agent's actual decision logic. Flagged here as a Phase 3+ candidate, not proposed for implementation now.

---

## 9. Missing Product Capabilities

Consolidated from §3/§4 plus the full docs audit, deduplicated:

1. Onboarding (grade/goals/style capture) — `04_Learner_Journey.md`
2. Progress/mastery dashboard (data exists in `learner_concept_mastery`, unread) — `12_Learner_Profile_Model.md` §5-6
3. Revision/spaced-repetition surface — `12_Learner_Profile_Model.md` §10 ("Revision Planner")
4. Achievement/streak system — `12_Learner_Profile_Model.md` §11
5. Parent portal (weekly summary, weak-concept visibility) — `03_User_Personas.md` Persona 4
6. Teacher dashboard (class-level aggregate view) — `03_User_Personas.md` Persona 5 (Future)
7. Evaluation/Observability visibility (internal-facing, but real) — §6 above
8. Voice input/output — `01_Vision.md`, `02_PRD.md`
9. Image/handwriting input — `02_PRD.md` Future Scope (out of Phase 2 scope per §8 above; needs Concept/Practice Agent changes)

---

## 10. Repository Refactoring Opportunities

None of these touch M0–M9's agent logic; all are process/infrastructure hygiene:

- **No committed test suite.** Every regression check across M5–M9 (179 assertions) lives in an external scratchpad directory, not in the repository — meaning a fresh clone of this repo has zero automated verification. Recommend porting these into `web/` as a real, committed test suite (the existing mocked-injection pattern every agent already uses makes this mechanical, not a redesign).
- **No CI pipeline.** No `.github/workflows/`. `npm run build` and `npm run lint` are both fast and clean today — wiring them (plus the ported test suite) into GitHub Actions on every PR is low-risk, high-credibility-per-effort for a showcase audience.
- **No design system / component library.** Every page hand-rolls inline styles. Establishing shared components (button, input, message bubble, card) before building 4-5 new surfaces (dashboards, portals) avoids the same inline-style debt multiplying across Phase 2.
- **The Langfuse/Observability Agent conflict** (§1) should be formally reconciled in `06_Technical_Architecture.md` — either retroactively documenting the custom-events-table decision as the accepted path, or scheduling a real Langfuse integration — rather than left as two contradicting documents. This is a documentation decision, not an infrastructure change, and doesn't conflict with "don't optimize infrastructure."
- **The `messages` RLS role-integrity gap** (§1, carried from the Production Verification Sweep) — a one-line policy fix, not an architecture change. Recommend closing it early in Phase 2 given how many new UI surfaces are about to start reading conversation history.

---

## 11. Risks

- **Scope creep back into "completed architecture."** Several tempting Phase 2 items (revision scheduling, achievement triggers, voice) brush up against agent decision logic. Each phase below is scoped to stay on the read/new-surface side of that line; any phase that can't be kept there should come back for explicit sign-off before starting, per the standing constraint.
- **The Langfuse/events-table conflict compounds if left alone.** Every new dashboard proposed below (§6, teacher, parent) reads from the same `events` table the architecture doc said was rejected as a dashboard source. Building three more dashboards on top of an explicitly-rejected approach without resolving the conflict first is a real risk of institutionalizing a decision nobody actually made.
- **No admin/service-role auth model exists.** Teacher dashboards, parent portals, and any MCP server exposing student data all need an access-control model beyond today's "every table is scoped to `auth.uid()` = the student." This is new design work, not a UI task — likely the single largest hidden scope item in this roadmap.
- **Voice is the highest-uncertainty item** — no vendor decision, no spec, no cost model, and real latency/UX risk for a tutoring product (a slow voice turnaround is worse than no voice). Recommend treating it as its own scoped mini-roadmap when its phase arrives, not estimated in detail here.
- **"Showcase-ready" is a moving target without a concrete audience artifact.** Recommend the product owner name what the actual showcase moment is (a live demo? a recorded walkthrough? an open sign-up?) before Phase 2 is fully prioritized — it changes which of the phases below matter most.

---

## 12. Recommended Implementation Order

**Revised 2026-07-13 per product-owner (Principal Architect) direction** — supersedes this section's original draft. Reordered and expanded from the original nine-phase sketch into the eight phases below. Each phase still gets its own implementation-plan-and-approval cycle, same as every M0–M9 milestone did — this section is sequencing and scope, not a green light to start all of them at once. Three items below are marked **NEEDS CLARIFICATION** — those are not yet approved even under this revised structure; see the Open Decisions section at the end.

**Phase 1 — Product Experience.** UI/UX modernization, a shared design system (button/input/card/message-bubble), streaming chat replies, a real homepage (currently "Coming soon"), and a proper onboarding flow (grade/goals/style capture feeding Personalization Agent's existing, currently-unfed inputs). Zero backend/agent-logic change. Unblocks every later UI phase.

**Phase 1.5 — Repository Hardening.** *Inserted per product-owner decision: pulled earlier rather than left in Phase 8.* Port the scratchpad test suite (179 assertions) into the repo as a real, committed test suite; wire up GitHub Actions CI; close the `messages` table's RLS role-integrity gap (§1); formally reconcile `06_Technical_Architecture.md` to reflect the Langfuse decision below. Sequenced here specifically so Phase 2's new dashboards and Phase 4/6's new access paths get built on a tested, CI-covered foundation rather than adding more untested surface area on top of a repo with zero committed tests today.

**Phase 2 — AI Transparency.** Agent pipeline visualization, Evaluation Agent metrics, Safety Agent gate decisions, Memory Agent's learner-profile updates, and cost/latency panels — all made visible in the UI for the first time. This is the single highest-leverage phase for the named showcase audience specifically: real multi-agent, self-evaluating, safety-gated architecture, currently invisible. The cost/latency panel is a direct, ready-made consumer of the token-logging work already shipped (every agent now logs `model`/`inputTokens`/`outputTokens`/`estimatedCostUsd`/`latencyMs`). **In-product panels read from the existing Observability Agent** (per the Langfuse decision below), not Langfuse — Langfuse is scoped to Phase 5's engineering-side monitoring instead. All of it is read-only and additive; it needs one small, scoped prerequisite — `events` currently has no SELECT RLS policy for anyone, including the owning student, so a narrow admin/self-read policy (or equivalent access path) has to be added before this phase can read real data, not a redesign.

**Phase 3 — Student Experience.** Progress dashboard and a learning-roadmap view (both read surfaces over the existing curriculum tables and `learner_concept_mastery` — no new agent decisions), a revision planner, and achievements. Revision *scheduling* (if it's automated rather than just a suggested-next-topic display) and achievement *trigger logic* are the two pieces here that are genuinely new decision logic, not just display — worth their own narrow scoping pass when this phase is actually planned, same as any other new agent-adjacent logic would be.

**Phase 4 — Teacher Studio.** Lesson planning, an assessment builder, a curriculum explorer, and Learning Commons integration (via provider abstraction, built in Phase 6). This is materially larger than a read-only dashboard — lesson planning and assessment building are authoring tools, likely needing their own generation capability (new, teacher-facing, additive — not a modification of the student-facing M6/M7 agents) and new schema for authored content. Sequenced after Phases 1–3 so it's built on a proven design system and transparency/access-control foundation rather than first. **Confirmed teacher-facing, not student-runtime**, per product-owner scope: curriculum exploration, standards alignment, learning objective discovery, concept relationships, misconception lookup, lesson planning assistance, and assessment authoring support — the student tutoring pipeline keeps using MentorOS's own Postgres curriculum data unchanged, exactly as Phase 6's `CurriculumProvider` design (below) keeps them decoupled.

**Phase 5 — Evaluation Platform.** An evaluation harness, benchmark datasets, a regression framework, and AI quality trend reports — distinct from Phase 2's real-time per-turn panel, this is offline QA infrastructure *around* the existing Evaluation Agent (detecting drift/regressions, not tuning prompts). This formalizes the ad hoc mocked-test pattern used throughout M5–M9 into real, committed, repeatable tooling. **Also where Langfuse is integrated** (per the "run both" decision below) — Langfuse serves engineering-side AI-quality monitoring here, separate from Phase 2's in-product Observability Agent panels. Confirmed in-scope under the "don't optimize prompts" constraint as long as it stays measurement/detection, not automated prompt tuning — flagging that boundary explicitly so it's not crossed by accident once this phase is actually planned.

**Phase 6 — Platform Integrations.** Build a new **`CurriculumProvider`** interface (per product-owner's naming refinement — domain-named, not vendor-named, matching how `KnowledgeProvider` itself was never called `PostgresProvider`) and two concrete implementations: `LearningCommonsCurriculumProvider` (REST, `https://api.learningcommons.org/knowledge-graph/v0`) and `LearningCommonsMcpCurriculumProvider` (MCP, `https://kg.mcp.learningcommons.org/mcp`, wrapping its three tools — Find Academic Standard Statement, Find Learning Components, Find Learning Progressions). A `PostgresCurriculumProvider` can be added alongside them, reusing (not modifying) the existing M5 curriculum tables read-only, so Teacher Studio can query "our" curriculum and Learning Commons' through the same interface. **Explicitly a new, separate interface — not a rename or extension of the existing `KnowledgeProvider`/`ConceptSearchProvider`** that Planning Agent and Concept Agent already depend on; those stay completely untouched, satisfying "do not change Planning Agent or Concept Agent logic" exactly. `HybridCurriculumProvider`, `NCERTCurriculumProvider`, `CambridgeCurriculumProvider`, and an `IBProvider` are the named long-term extension points, not built now. One operational prerequisite this phase needs from you before it can start: a Learning Commons API key (account/sign-up), stored as a new server-only env var alongside the existing `ANTHROPIC_API_KEY` pattern.

**Phase 7 — Multimodal Experience.** Voice, an avatar abstraction (an interface/seam, not a committed vendor or design — reasonable given no avatar product basis exists in any doc today), and a conversation orchestrator. Voice matches long-standing, real product vision (`01_Vision.md`, `02_PRD.md`) that's simply never been built; avatar-as-abstraction is a sensible, low-commitment way to leave the seam open without inventing product requirements that don't exist yet. **Conversation orchestrator: resolved as multimodal turn-taking only** (per product-owner decision) — a thin coordination layer sequencing audio in/out around the existing text pipeline, additive, not touching Concept/Practice/Assessment/etc.'s internal decision logic. Reopening the core Planning-Agent-as-orchestrator pattern (§5/§1) remains explicitly out of scope for this roadmap.

**Phase 8 — Repository & Developer Experience.** World-class README, ADRs, sequence diagrams, a demo video, screenshots, API documentation. Test/CI/RLS-fix/Langfuse-reconciliation work has been pulled forward into Phase 1.5 instead (per product-owner decision) — Phase 8 is documentation/presentation polish only.

**Not sequenced / not recommended under current constraints:** agents consuming external MCP tools directly (Phase 6 is scoped to the provider/exposure direction only); image/handwriting input (touches completed Concept/Practice Agent logic).

---

## Open Decisions

**Resolved 2026-07-13:**
- Conversation orchestrator (Phase 7) → multimodal turn-taking only, not core agent re-orchestration.
- Tests/CI/RLS fix/Langfuse reconciliation → pulled forward into new Phase 1.5, ahead of Phase 2.
- Langfuse vs. custom Observability Agent → **run both**: Observability Agent stays as the in-product read surface (Phase 2), Langfuse is added separately for engineering-side AI-quality monitoring (Phase 5). `06_Technical_Architecture.md`'s reconciliation (documenting this as the accepted decision rather than leaving the "rejected for now" language standing) is part of Phase 1.5's scope, not done yet.
- **Learning Commons identified**: [learningcommons.org](https://learningcommons.org/news/claude-for-teachers/) — see §8 for the grounded technical summary (REST + MCP, US standards + IM 360 math data). Scoped teacher-facing only, via a new `CurriculumProvider` interface (§12 Phase 6), never touching Planning/Concept Agent or the student pipeline. One flagged, not-yet-resolved nuance: Learning Commons' current standards data is US-specific, with no crosswalk to MentorOS's own NCERT curriculum — doesn't block Teacher Studio's core use cases, but "aligning" the two datasets specifically would be new scope if ever wanted.

**Still open, operational (not architectural) — needed before Phase 6 can actually start, not before Phase 1:**
- A Learning Commons API key/account, to be provisioned by you and handed over as a new env var when Phase 6 is actually planned.

Phase 1 can start as soon as this roadmap is approved — nothing above blocks it.
