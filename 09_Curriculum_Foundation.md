# Curriculum Foundation

**Product:** MentorOS

**Version:** 1.0

**Status:** Draft

**Author:** Kalpana Yadav

---

# Purpose

This document defines the **Learning Knowledge Model** — the abstract, reusable structure MentorOS uses to represent how a subject is organized and how students learn it. It is the document `08_Roadmap.md` flags as a prerequisite for M3 (Planning Agent), and the one every agent spec already assumes exists: Knowledge Retrieval, Planning, Concept, Practice, Assessment, Reflection, and Memory all reference prerequisites, mastery, misconceptions, or Bloom's Taxonomy today without any of them defining where that data actually lives or how it's shaped. This document is where it's defined.

**This document does not contain curriculum content.** NCERT Class 3 Mathematics will be the first real dataset that implements this model, but populating it is separate work, done after this model is agreed. Writing content against an unstable model wastes the content; agreeing the model first means every future subject, grade, and curriculum standard reuses it without a redesign.

---

# Why This Exists

MentorOS cannot plan a lesson (M3), retrieve grounded content (M5), generate targeted practice (M7), or detect a misconception (M7) against curriculum data that has no defined shape. Every one of those agents already has a "Knowledge Access" or "Supported Sources" section naming things like *Curriculum hierarchy*, *Prerequisite graph*, and *Common Misconceptions Repository* — this document is what turns those references from assumed context into an actual, buildable model.

It also has to survive contact with reality beyond a single subject and grade: NCERT Class 3 Mathematics is the first dataset, not the only one MentorOS will ever need. A model that only works for one subject/grade/curriculum standard would need to be redesigned the moment a second one arrives — so this model is written subject-, grade-, and standard-agnostic from the start.

---

# Two Layers, Not One

MentorOS's curriculum knowledge is deliberately split into two layers that are related but distinct:

## 1. Curriculum Structure

*What the subject is made of, and how it's organized.* Subjects, grades, chapters, concepts, the learning objectives within them, the relationships between concepts (prerequisites, dependencies), and the learning resources that teach them. This is closer to a syllabus — it answers "what exists, and in what order."

## 2. Pedagogical Knowledge

*How to actually teach and evaluate that structure.* Common misconceptions, remediation strategies, teaching strategies, mastery criteria, Bloom's Taxonomy levels, and assessment objectives. This is closer to a teacher's professional knowledge — it answers "how does a student get this wrong, and what do you do about it."

Keeping these separate matters because they change independently and are authored differently: curriculum structure tends to come from an official syllabus document and changes when the syllabus changes; pedagogical knowledge comes from teaching experience and improves continuously as MentorOS observes real learners, independent of whether the underlying syllabus has changed at all. Every pedagogical entity below attaches *to* a curriculum structure entity (a Concept or a Learning Objective) rather than being embedded inside it.

---

# Design Principles

- **Relational, not a dedicated graph database.** Per `06_Technical_Architecture.md`'s explicit decision against introducing new specialized data stores before scale demands it, this model is designed to live in the existing Supabase Postgres database. "Knowledge graph" describes the *shape* of the data (nodes and typed relationships), not a specific storage technology — nodes are rows, edges are a relationship table. Revisit only if pgvector-scale reasoning ever applies here too (not expected before M9, if ever).
- **Model first, content second.** This document defines entities and relationships. NCERT Class 3 Mathematics — or any other subject, grade, or standard — is data that *implements* this model, authored afterward.
- **Extensible relationships, not one hardcoded edge type.** `prerequisite_of` is the first relationship type this model needs, but not the only one it will ever need — see Concept Relationships below.
- **Versioned from day one.** Curriculum content changes (a syllabus revision, a corrected misconception, an improved teaching strategy). Every content-bearing entity carries version and status metadata so a change doesn't silently invalidate a learner's existing mastery history against an outdated version of a concept.
- **Concepts and Learning Resources are not the same thing.** A concept is a piece of knowledge; a resource is something that teaches it. Many resources can teach one concept, and one resource (a worked example covering both addition and place value, say) can teach several concepts.

---

# Part A — Curriculum Structure

## A1. Subject

- Subject ID
- Name (e.g. "Mathematics")
- Curriculum Standard (e.g. "NCERT", "CBSE", "Common Core" — the model does not assume a single standard)

---

## A2. Grade

- Grade ID
- Subject (reference)
- Grade Level (e.g. "Class 3")

---

## A3. Chapter

An optional grouping layer between Grade and Concept, matching how most syllabi are actually organized (a textbook chapter, not a single atomic idea).

- Chapter ID
- Grade (reference)
- Title
- Sequence (position within the grade)
- *Content Metadata* (see Part C)

---

## A4. Concept

The core node of the knowledge graph — a single, atomic piece of knowledge (e.g. "Equivalent Fractions," not "Fractions" as a whole).

- Concept ID
- Chapter (reference, optional — a concept could exist outside a chapter grouping)
- Name
- Description
- *Content Metadata* (see Part C)

Concepts do not store mastery criteria, Bloom's level, or assessment objectives directly — those attach through Learning Objectives (A5) where they apply at objective granularity, or directly to the Concept where they're genuinely concept-wide. See Part B for how pedagogical knowledge attaches.

---

## A5. Learning Objective

A first-class entity, not a field on Concept. A Learning Objective is a specific, measurable statement of what a learner should be able to do (e.g. "Given two fractions with different denominators, determine whether they are equivalent") — this is the granularity Bloom's Taxonomy, mastery criteria, and assessment objectives actually belong to, per how the Practice and Assessment Agent specs already describe them.

- Learning Objective ID
- Statement (the measurable "can do" description)
- Bloom's Taxonomy Level (Remember / Understand / Apply / Analyze / Evaluate / Create)
- *Content Metadata* (see Part C)

**Relationship to Concept:** many-to-many via `concept_objectives` — a concept typically has several learning objectives, and an integrative objective can span more than one concept (e.g. "solve a word problem using both addition and place value").

---

## A6. Learning Resource

Distinct from Concept. A resource is something that *teaches* — a worked example, a video, a textbook page, a diagram, a story-based analogy (the same categories Knowledge Retrieval Agent's spec already lists under "Supported Knowledge Sources").

- Resource ID
- Type (worked example / explanation / visual / analogy / practice set / other)
- Title
- Content Reference (pointer to the actual stored content — format intentionally left open; this document defines the relationship, not the content storage mechanism, which is Knowledge Retrieval Agent's concern at M5)
- *Content Metadata* (see Part C)

**Relationship to Concept:** many-to-many via `resource_concepts` — one resource can cover several concepts, and a concept is typically covered by more than one resource (Knowledge Retrieval Agent picks among them by relevance, quality, and recency, per its existing Ranking Criteria).

---

## A7. Concept Relationships (the graph edges)

The knowledge-graph backbone. Rather than a fixed `prerequisite_id` column on Concept, relationships are their own entity with a typed, extensible `relationship_type` — new relationship kinds can be added later without a schema redesign, directly satisfying the requirement that this support future Planning, Memory, Retrieval, and Analytics needs unknown today.

- Relationship ID
- From Concept (reference)
- To Concept (reference)
- Relationship Type — open set, not a hardcoded pair of columns. Version 1 needs at minimum:
  - `prerequisite_of` — From must be understood before To (the directed edge Planning Agent's spec already calls "prerequisite graph")
  - `builds_on` — To extends From without strictly requiring mastery first (softer than prerequisite)
  - `related_to` — lateral connection, no directionality implied (useful for Retrieval's "topic similarity" signal)
  - `part_of` — From is a component of the broader To (e.g. "Adding Fractions" is `part_of` "Fractions")
- *Content Metadata* (see Part C)

Future relationship types (e.g. `alternative_to` for equivalent concepts across curriculum standards, `remediated_by` linking a concept directly to a remediation path) are additive — a new row in whatever enumerates valid types, not a new column or table.

---

# Part B — Pedagogical Knowledge

Every entity in this section attaches *to* a Part A entity (a Concept or a Learning Objective) via a reference — none of them are embedded fields on the curriculum structure itself, per the separation described above.

## B1. Common Misconception

- Misconception ID
- Concept (reference) — misconceptions are anchored to a concept, since a misconception is fundamentally a misunderstanding of a piece of knowledge, not of a single measurable objective
- Related Learning Objectives (optional, many-to-many) — for a misconception that specifically undermines certain objectives rather than the concept broadly
- Description (what the learner incorrectly believes)
- Common Triggers (what kind of question or phrasing tends to surface it)
- *Content Metadata* (see Part C)

This is the entity Assessment Agent's "Misconception Detection" and Practice Agent's "Misconception Targeting" both already assume exists as a queryable repository.

---

## B2. Remediation Strategy

- Remediation ID
- Misconception (reference)
- Approach (what to do — a re-explanation angle, a targeted practice pattern, a prerequisite revision recommendation)
- Recommended Resources (optional, references into A6 Learning Resource)
- *Content Metadata* (see Part C)

Feeds Planning and Reflection Agents' existing "recommend prerequisite revision" and "what should happen next" logic with a concrete, queryable answer rather than an ad hoc decision.

---

## B3. Teaching Strategy

- Strategy ID
- Concept (reference) — the primary attachment point, since a teaching approach ("use a visual fraction bar," "use a real-world sharing analogy") is usually concept-wide
- Related Learning Objective (optional reference) — for a strategy specific to one objective rather than the whole concept
- Description
- When To Use (e.g. learner profile signals this strategy suits — low mastery, visual learner preference)
- *Content Metadata* (see Part C)

Feeds Planning Agent's "which teaching strategy maximizes understanding?" question and Concept Agent's strategy selection directly.

---

## B4. Mastery Criteria

- Criteria ID
- Learning Objective (reference) — mastery is defined at objective granularity, per this document's refinement, since "mastered" only means something concrete relative to a specific measurable statement
- Evidence Required (what observable performance counts as mastered — e.g. "3 consecutive correct answers across varied question types")
- *Content Metadata* (see Part C)

This is what Assessment and Memory Agents' existing `mastery_score` fields should be calculated *against* — a concrete, per-objective definition rather than an implicit threshold.

---

## B5. Assessment Objective

- Assessment Objective ID
- Learning Objective (reference)
- What Must Be Tested (the specific thing a valid assessment question must probe to actually evaluate this objective, not just the concept generally)
- *Content Metadata* (see Part C)

Gives Assessment Agent's question-evaluation logic a concrete target instead of inferring what "evaluate my solution" should actually check.

---

# Part C — Content Metadata (shared across all content-bearing entities)

Every entity in Parts A and B carries this shared metadata block, supporting future curriculum revisions without invalidating a learner's history against a stale version:

- Version (increments on meaningful content change)
- Status (Draft / Published / Deprecated)
- Curriculum Standard Reference (which standard/syllabus this instance implements, e.g. "NCERT Class 3 Mathematics, 2024 edition")
- Source (where this content came from — a textbook chapter, an author, a review)
- Effective From / Effective Until (optional date range, for content tied to a specific syllabus year)
- Created At / Updated At
- Last Reviewed By

A learner's mastery record (Learner Profile Model, `12_Learner_Profile_Model.md`) should reference the specific *version* of a Learning Objective it was measured against, so a later content revision doesn't retroactively and silently change the meaning of a historical mastery score.

---

# Storage Mapping

All of Parts A, B, and C map to relational tables in the existing Supabase Postgres database — no new database technology. Concepts and Learning Objectives are rows; Concept Relationships (A7) and the Concept↔Objective / Concept↔Resource associations (A5, A6) are join/edge tables; Pedagogical Knowledge entities (Part B) are their own tables referencing back into Concept or Learning Objective by foreign key. This document defines the entities and relationships; the actual migration (table definitions, indexes, RLS policies) is implementation work for whenever M3 or M5 actually builds against this model, following the same "reuse existing components, minimal schema footprint" discipline M0–M2 already established.

---

# How Agents Consume This Model

| Agent | Reads |
|---|---|
| Router Agent | Concept, for topic/subtopic grounding (currently free text — see M2-01's open issue) |
| Planning Agent | Concept Relationships (prerequisite graph), Learning Objectives, Teaching Strategy |
| Knowledge Retrieval Agent | Concept, Learning Resource, Concept Relationships (topic similarity) |
| Concept Agent | Concept, Learning Objective, Teaching Strategy, Common Misconception |
| Practice Agent | Learning Objective (Bloom's level), Common Misconception |
| Assessment Agent | Mastery Criteria, Assessment Objective, Common Misconception |
| Reflection Agent | Common Misconception, Remediation Strategy |
| Memory Agent | Mastery Criteria (to interpret evidence into the Learner Profile's mastery scores) |
| Evaluation Agent | Assessment Objective, Mastery Criteria (to judge whether an assessment actually tested what it claimed to) |

No agent in this milestone (M2) or the next (M3) writes to this model — it is authored content, read-only from every agent's perspective. Only a future content-authoring process (human-authored or agent-assisted) creates or revises entries here.

---

# Illustrative Example (not real seeded content)

To make the model concrete — this is illustrative only, not the actual NCERT dataset:

```
Concept: "Equivalent Fractions" (part_of "Fractions")

Learning Objective: "Given two fractions with different denominators,
                      determine whether they represent the same value"
  Bloom's Level: Apply

Concept Relationship: "Equivalent Fractions" prerequisite_of "Adding Fractions
                       with Unlike Denominators"

Common Misconception: "Believes a larger denominator always means a smaller
                        numerator is needed for equivalence"
  Remediation Strategy: "Use a visual fraction-bar comparison before
                          introducing the cross-multiplication shortcut"

Mastery Criteria (for the Learning Objective above):
  "3 consecutive correct equivalence judgments across at least 2 different
   denominator pairs"

Assessment Objective (for the same Learning Objective):
  "Question must present two fractions with unlike denominators and require
   a same/different judgment, not a computation the student could pattern-
   match without understanding equivalence"
```

---

# What This Document Does Not Do

- Does not populate any real curriculum content (NCERT Class 3 Mathematics or otherwise) — that is separate, later work against this model.
- Does not define the Postgres migration (tables, indexes, RLS policies) — implementation for whenever M3/M5 actually build against this.
- Does not change how any existing agent or milestone (M0–M2) currently works — Router Agent's `topic`/`subtopic` fields remain free text until something actually implements this model and Router is updated to validate against it.

---

# Future Extensions

- Multiple curriculum standards mapped to shared Concepts (e.g. an NCERT concept and a Common Core concept both mapping to the same underlying Learning Objective, for cross-standard content reuse).
- Difficulty calibration data per Learning Objective, derived from real learner performance rather than authored a priori.
- Automated misconception discovery from Assessment Agent's real-world detection feeding back into Part B as candidate new entries (human-reviewed before promotion to Published status).

---

# Success Criteria

A successful Curriculum Foundation enables MentorOS to:

- Represent any subject, grade, or curriculum standard without a schema redesign.
- Answer "what must a learner know before this" and "how do learners typically get this wrong" as direct, queryable facts rather than agent-improvised guesses.
- Let curriculum content (syllabus-driven) and pedagogical knowledge (experience-driven) evolve independently.
- Support Planning, Retrieval, Practice, Assessment, Reflection, and Memory agents against the same underlying model, each reading only what its own spec already says it needs.
- Survive a real content revision (a syllabus update, a corrected misconception) without silently invalidating a learner's historical mastery record.
