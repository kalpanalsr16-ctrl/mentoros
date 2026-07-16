# UI Architecture — Overview

**Phase:** 2, Phase 1A.5 — UI Architecture & Information Architecture
**Lifecycle position:** between the approved Design System (Phase 1A) and Phase 1's Implementation stage.
**Status:** Documentation and architecture only. No React, no CSS, no backend logic, no M0–M9 architecture has been touched.

---

## Purpose

The Design System (`docs/design-system/`) answered "what does MentorOS look and feel like" — tokens, components, principles. This folder answers a different question: **"what does MentorOS consist of, exactly, and how does every piece fit together?"** Every page, every screen's data needs, every API contract, every reusable component's ownership, and the exact sequence of implementation tasks are specified here so that when implementation begins, no engineer has to make an undocumented judgment call about scope, data, or structure. That's the test this folder is written against: could someone who wasn't in any of the Phase 2 planning conversations pick up `13_Implementation_Sequence.md` and build MentorOS's application shell correctly, task by task, without asking what a screen needs or where a component belongs.

## Scope

Everything a signed-in user (student, teacher, or parent) sees and does inside MentorOS, plus the public-facing landing/auth surface. Explicitly in scope: page structure, navigation, screen-level data requirements, component reuse, API contracts for every new page, frontend state architecture, and the exact build order. Explicitly out of scope, per this phase's constraints: any actual code, any change to M0–M9's agent logic or existing `/api/chat` contract, any visual/pixel-level design (that's the Design System's job, already done), and any new product decision not already established by `15_Phase2_Roadmap.md` or its approved amendments.

## Principles

1. **Nothing here contradicts M0–M9.** Every API contract in `10_API_Contracts.md` for existing data (chat, evaluation, safety, mastery) reads from the schema and agents that already exist and are already live-verified. New surfaces get new, additive endpoints and, where genuinely needed, new tables — never a modification of an existing route or agent.
2. **Every screen justifies its own existence against a real data source.** No screen in `02`–`04` is designed against data that doesn't exist somewhere in M0–M9's schema or a clearly-flagged new table — if a screen needs something MentorOS doesn't track yet, that's called out explicitly, not glossed over.
3. **One component, one owner, many consumers.** `08_Component_Ownership.md` exists specifically to prevent the same visual pattern (a progress card, a stat tile) from being quietly reinvented three times across Student, Teacher, and Parent surfaces.
4. **Determinism over cleverness.** `13_Implementation_Sequence.md` is written to be followed literally, in order, by whoever implements it — task-by-task, PR-sized, each with explicit acceptance criteria. Ambiguity in that document is a defect in this document, not something implementation is expected to resolve on its own.
5. **Flag what's genuinely undecided.** Where a screen implies a real product/legal question this phase can't answer on its own (see §"Open flags" below), it's named directly rather than silently assumed away.

## Relationship to the Design System

The Design System (`docs/design-system/`) defines *how things look*: tokens, primitives, patterns, motion, states. This folder defines *what exists and how it's wired*: pages, data, APIs, state, sequencing. Every screen document in `02`–`04` names which Design System patterns it uses (§8's ownership map is the canonical cross-reference) — this folder never invents new visual components; if a screen needs something the Design System doesn't have yet, that's flagged as a Design System gap to close, not solved ad hoc here.

## Relationship to existing MentorOS architecture

This folder is a consumer of M0–M9, never a modifier of it. Every reference to an agent (Safety, Router, Planning, Personalization, Knowledge Retrieval, Concept, Practice, Assessment, Reflection, Memory, Evaluation, Observability) describes reading its existing, already-logged output — through new, additive API routes — never a change to how that agent decides anything. Where a new capability (lesson planning, revision scheduling, achievements) needs logic that doesn't exist yet, this folder specifies it as new, separate, teacher/student-facing functionality, explicitly not a modification of the completed pipeline, consistent with every constraint given since Phase 2 began.

## Relationship to future phases

This folder specifies the *entire* application shell — Student, Teacher, Parent, and the transparency surfaces — because `15_Phase2_Roadmap.md`'s phases (1 through 8) all eventually build inside this shell. Designing it once, completely, now, is what makes each later phase an implementation task against a known structure rather than a re-litigation of where things go. `12_Future_Extensibility.md` is where Voice, Avatar, MCP, the Evaluation Platform, and other not-yet-built roadmap phases get named extension points — this document doesn't build them, it makes sure the shell doesn't have to be reshaped when they arrive.

## Open flags (Staff-level, not silently resolved)

Two real product/legal questions surface directly from designing Teacher Studio and the Parent Portal, named here once rather than repeated in every document that touches them:

- **Parent-student linking needs a consent/verification flow**, not just a database join. A parent account claiming access to a student's data is a real child-privacy question (COPPA/FERPA-adjacent, depending on jurisdiction and institutional context) that this architecture documents the *data shape* for (`04_Parent_Portal.md`, `10_API_Contracts.md`) but does not resolve the legal/product policy for. Flagged for explicit product-owner decision before Phase 2's Parent Portal phase is implemented, not blocking this documentation pass.
- **Teacher-student data access needs a roster/enrollment model with real verification** (a teacher shouldn't be able to claim any student by ID), not just a `class_students` join table existing. The data shape is specified (`03_Teacher_Studio.md`); the verification/invite flow is named as an implementation-time decision, not designed in full here.

## Document map

| Doc | Answers |
|---|---|
| `01_Application_Map.md` | What pages exist, who reaches them, how |
| `02_Student_Experience.md` | Every student-facing screen, fully specified |
| `03_Teacher_Studio.md` | Every teacher-facing module, fully specified |
| `04_Parent_Portal.md` | The parent-facing surface, fully specified |
| `05_Chat_Experience.md` | The tutoring conversation surface in full detail |
| `06_Dashboard_Architecture.md` | Shared dashboard grammar across all four dashboards |
| `07_AI_Transparency_Panel.md` | The flagship multi-agent visualization |
| `08_Component_Ownership.md` | Every reusable component and who uses it |
| `09_User_Journeys.md` | End-to-end paths through the product, per persona |
| `10_API_Contracts.md` | Every endpoint every page needs |
| `11_State_Management.md` | Frontend state architecture |
| `12_Future_Extensibility.md` | Where Voice/Avatar/MCP/etc. plug in |
| `13_Implementation_Sequence.md` | The exact, ordered build checklist |
| `../showcase/SHOWCASE.md` | The technical narrative for external reviewers (Anthropic, OpenAI, Microsoft, Khan Academy, Duolingo, etc.) |
