# Milestone M5 — Completion Report

**Status:** ⏳ Substantially verified — not yet closed (2 open items gate final closure; see Remaining Gaps)
**Date:** 2026-07-11
**Reviewer:** Lead Engineer gate review (this document)

---

## Objectives

M5's job, per `08_Roadmap.md`, was the Knowledge Retrieval Agent: replace M3's static, in-code curriculum dataset with real retrieval. Before implementation, a real documentation gap surfaced — `06_Technical_Architecture.md` never specified an embedding model/provider despite the roadmap originally describing M5 as vector/semantic retrieval — and rather than silently pick a vendor or silently keep exact-match-only search, the milestone was split, with the product owner's explicit agreement, into two phases:

- **M5A — Curriculum Persistence**: migrate `09_Curriculum_Foundation.md`'s model into real Postgres tables (`PostgresKnowledgeProvider`), with `KnowledgeProvider`'s structured-lookup contract unchanged.
- **M5B — Retrieval Intelligence**: improve topic-to-concept resolution independently of storage, via a new `ConceptSearchProvider` abstraction, implemented with Postgres trigram search (`TrigramConceptSearchProvider`) rather than embeddings — a real improvement over exact-name matching, with the embedding-provider decision explicitly and visibly deferred rather than resolved either way.

---

## Tasks Completed

| # | Task | Commit(s) | Doc |
|---|---|---|---|
| 1 | M5A + M5B: schema, seed data, `PostgresKnowledgeProvider`, `ConceptSearchProvider`/`TrigramConceptSearchProvider`, Planning Agent rewiring | `ae6042d` | [M5-01](../implementation/M5-01-Curriculum-Persistence.md), [M5-02](../implementation/M5-02-Retrieval-Intelligence.md) |
| 2 | Content Metadata inconsistency resolved — two documented profiles (C1 full / C2 narrower) instead of an undocumented asymmetry | `5db9b14` | Updated [09_Curriculum_Foundation.md](../../09_Curriculum_Foundation.md) Part C |
| 3 | Rollback scripts for both forward migrations, committed before first live application | `0298d13` | `web/supabase/rollbacks/0002_curriculum_foundation.down.sql`, `.../0003_seed_....down.sql` |
| 4 | Migrations applied to production; verification | *(applied directly via Supabase SQL Editor, not a commit)* | [M5-03](../implementation/M5-03-Production-Verification.md) |

Working tree is clean. All four commits above exist only on local `main` (not yet pushed to `origin` — same standing practice as M4: requires explicit authorization).

---

## Architecture Changes Introduced in M5

- **`KnowledgeProvider` and `ConceptSearchProvider` are now two separate interfaces**, not one. `KnowledgeProvider` owns structured, ID-keyed lookups (`getConcept`, `getPrerequisites`, `getLearningObjectives`, `getMisconceptions`, `getTeachingStrategies`, `getMasteryCriteria`); `ConceptSearchProvider` owns exactly one method, `findConceptIdByTopic`, translating a free-text topic into a concept ID. Planning Agent's `buildPlanningContext()` composes them explicitly (`findConceptIdByTopic` → `getConcept`), and never sees a concrete implementation of either — only the interfaces, injected by the composition root (`/api/chat`).
- **Ten new normalized Postgres tables** (`subjects`, `grades`, `chapters`, `concepts`, `concept_relationships`, `learning_objectives`, `concept_learning_objectives`, `misconceptions`, `teaching_strategies`, `mastery_criteria`) replace M3's static in-code dataset, migrating all of `09_Curriculum_Foundation.md`'s Part A (Curriculum Structure) and Part B (Pedagogical Knowledge) except the still-unused Learning Resources (A6).
- **Text primary keys, not `uuid`**, for every curriculum table — a deliberate departure from `profiles`/`conversations`/`messages`/`events`'s convention, since curriculum content is authored, cross-referenced reference data (`addition-with-regrouping`) rather than runtime user data.
- **Two documented Content Metadata profiles, not one**: C1 (full — Version, Status, Curriculum Standard Reference, Source, Effective From/Until, Created/Updated At, Last Reviewed By) for Curriculum Structure entities; C2 (narrower — no Curriculum Standard Reference or Effective dates) for Pedagogical Knowledge entities, on the reasoning that a misconception or teaching strategy isn't an artifact of a specific syllabus edition the way a Concept is. This was a real design decision made explicit during this milestone, not an inherited assumption.
- **RLS shifts to a new shape for this project**: every curriculum table is `SELECT`-only for any `authenticated` user (`using (true)`), with no write policy at all — the first "shared reference data, owned by no one student" RLS pattern in MentorOS, distinct from every prior table's per-student-ownership (`auth.uid()`) scoping.
- **Postgres trigram search (`pg_trgm`), not an embedding provider**, backs topic resolution. `search_concept_id()` is a `plpgsql` function doing exact case-insensitive match first, then `similarity() > 0.3` trigram fallback — a deliberate, documented choice to avoid introducing a new AI/vendor dependency before curriculum scale (currently one chapter) creates a real, felt retrieval problem.
- **Rollback scripts now exist for both forward migrations**, in a separate `web/supabase/rollbacks/` directory (not numbered alongside forward migrations, so a future CLI-linked project never mistakes a `.down.sql` for the next migration to apply) — the first migration/rollback pair in this project's history.
- **No downstream agent changed.** Verified directly, not just by type-signature reasoning: `decidePlan()` produces identical output run through the old (M3, single `findConceptByTopic` call) and new (M5, two-provider) context-assembly paths.

---

## Database Changes

First schema migration since M0-03. Ten new tables, all RLS-enabled, `pg_trgm` extension enabled, one new SQL function (`search_concept_id()`), one new GIN trigram index (`concepts_name_trgm_idx`). No changes to any existing M0–M4 table. Full column-by-column detail in [M5-01](../implementation/M5-01-Curriculum-Persistence.md) and the migration files themselves.

---

## Infrastructure

No new infrastructure, no new environment variables. Migrations applied directly via the Supabase Dashboard SQL Editor (no service-role key or linked CLI project available in this environment, consistent with M0-03's own history).

---

## Security

- RLS enabled on all 10 new tables from the start, verified live: unauthenticated (anon-key) requests correctly receive `200 []`, not the seeded data, confirming no policy applies to the `anon` role.
- No new write surface — every curriculum table is read-only from the app's perspective; content authoring happens only via migrations run with direct database access.
- Safety-filter regression (24 phrases, all 4 categories) re-run and passing — M5 introduces no new path around the safety gate.
- No new credentials introduced.

---

## Observability

No new event types introduced by M5.

---

## Documentation

- [M5-01 — Curriculum Persistence](../implementation/M5-01-Curriculum-Persistence.md)
- [M5-02 — Retrieval Intelligence](../implementation/M5-02-Retrieval-Intelligence.md)
- [M5-03 — Production Verification](../implementation/M5-03-Production-Verification.md)
- [09_Curriculum_Foundation.md](../../09_Curriculum_Foundation.md) — Storage Mapping and Part C (Content Metadata) rewritten to match the real implementation
- [08_Roadmap.md](../../08_Roadmap.md) — M5 entry rewritten to describe the actual A/B split and the deferred embedding-provider decision
- `web/README.md` — `src/lib/knowledge/` and `supabase/` structure descriptions corrected (were still describing the static dataset and missing the new `rollbacks/` directory)

---

## Testing

Full detail in [M5-01](../implementation/M5-01-Curriculum-Persistence.md), [M5-02](../implementation/M5-02-Retrieval-Intelligence.md), and [M5-03](../implementation/M5-03-Production-Verification.md). Summary:

- **Verified live, in production**: all 10 curriculum tables exist (anon-key `404` → `200 []` transition); RLS correctly denies anonymous access; M0–M4 tables (`profiles`/`conversations`/`messages`/`events`) unchanged; unauthenticated `/api/chat` still `401`; `npm run build` clean.
- **Verified at the code level** (mocked, not yet a live authenticated round trip): `PostgresKnowledgeProvider` (5 assertions), `TrigramConceptSearchProvider` (6 assertions), `buildPlanningContext()`/`decidePlan()` end-to-end including the unresolved-topic skip path (5 assertions). 16 assertions total, all passing.
- **Safety regression**: 24/24 passing, unaffected by M5.
- **Not yet verified**: seed row counts, foreign-key integrity, exact RLS policy definitions, and `search_concept_id()`'s live matching behavior all require either the SQL Editor script's output or an authenticated session neither of which has been completed yet (see Remaining Gaps). No `TODO`/`FIXME`/`XXX` markers found in `web/src`.

---

## Risks

1. **Two verification items are still open** (SQL Editor output; one live authenticated end-to-end test) — see Remaining Gaps. Everything else checks out, but M5 shouldn't be treated as fully closed until these resolve, since they're the only checks that touch real seeded data and the real `search_concept_id()` execution rather than a mock.
2. **Trigram similarity is a real, accepted limitation**, not a bug — a topic that's a genuine paraphrase or synonym (not just a typo) may not resolve. The `0.3` threshold is a first guess, not tuned against real query data.
3. **The embedding-provider decision remains genuinely open** — documented in three places, revisit once real curriculum scale (multiple chapters/subjects) makes trigram search's limits a felt problem rather than a theoretical one.
4. **Learning Resources (Part A6) remain unmigrated** — no content type needing them exists yet.
5. **The seeded dataset still covers only one chapter** (carried from M3) — M6 (Concept Agent) will exercise this same single chapter until more content is authored.
6. *(carried from M4)* Preview/Staging remains behind Production; every learner still reports `isKnown: false` until M7/M8 exist.

---

## Lessons Learned

- Surfacing an undocumented dependency (the embedding provider/model M5's original scope assumed) before building against it, rather than guessing or silently working around it, turned a one-phase milestone into a better-scoped two-phase one — worth treating "the roadmap assumes X but X isn't documented anywhere" as a stop condition, per this project's own working principles.
- A Content Metadata block that looked like one shared shape in the design doc but was already asymmetric in a draft migration was worth resolving as an explicit, named two-profile model with per-field rationale, rather than silently patching the asymmetry or forcing symmetry that didn't semantically fit.
- Anon-key REST calls are a legitimate, zero-risk way to verify a good chunk of a migration's live state (table existence, RLS enforcement) even with no service-role key or authenticated session available — worth reaching for before assuming a live check requires elevated credentials.
- This project's own M1-07 precedent (hand off genuinely-live-only checks to a real human, signed in, using the real app) applies again here — not worth re-fighting an environment's credential constraints with more scripting once the constraint is well understood.

---

## Technical Debt

| Item | Severity | Notes |
|---|---|---|
| Seed row counts / FK integrity / RLS policy definitions unconfirmed live | Medium | SQL Editor script provided; awaiting paste-back — see Remaining Gaps |
| No live authenticated end-to-end test performed | Medium | Recommend the same manual pattern as M1-07 — see Remaining Gaps |
| Trigram threshold (`0.3`) not tuned against real query data | Low | First guess; revisit once real usage exists |
| Embedding-provider decision still open | Low | Deliberate; revisit at real multi-chapter/subject scale |
| Learning Resources (A6) unmigrated | Low | No content needing them exists yet |
| Seeded dataset covers one chapter only | Low | Carried from M3; M6 will exercise this same chapter |
| *(carried)* Preview/Staging behind Production | Medium | Unchanged from M4 |
| *(carried)* Every learner reports unknown | Medium | Unchanged from M3/M4; correct until M7/M8 |
| *(carried)* `07_Evaluation_Framework.md`, `10_Observability.md` empty | Medium | Still empty |
| *(carried)* 2 moderate `npm audit` advisories | Low | Pre-existing |

---

## Remaining Gaps Before M6

`08_Roadmap.md` lists M6 (Concept Agent, full spec) as depending on Knowledge Retrieval (M5), Planning (M3), Personalization (M4), and Context (M1) all existing — and `05_Agent_Architecture/08_Concept_Agent.md` already exists, so M6 is not blocked on missing documentation the way M5 briefly was. Two things are still worth closing out first, though neither blocks M6 architecturally:

1. **Finish M5's own verification** (the two open items above) before treating Knowledge Retrieval as a proven dependency rather than a mocked one — M6 will be the first agent to actually depend on M5's live behavior being correct, not just its interface shape.
2. **Curriculum content is still exactly one chapter.** M6's Concept Agent will only ever have this one chapter's worth of concepts/objectives/misconceptions/strategies to teach from until a second seed migration is authored — worth deciding whether M6 should be built and tested against this one chapter as-is, or whether a second chapter should be seeded first for a more representative test bed.

Nothing else identified: no new provider abstraction is needed for M6 per `08_Concept_Agent.md`'s own dependencies, and the `KnowledgeProvider`/`ConceptSearchProvider` split was specifically designed so M6 (and any future agent) can consume both without caring how either is implemented underneath.

---

## Final Acceptance Checklist

| # | Check | Result |
|---|---|---|
| 1 | All 10 curriculum tables exist in production | ✅ Verified live |
| 2 | Seed data present with correct row counts | ⏳ Pending SQL Editor output |
| 3 | Foreign-key integrity holds | ⏳ Pending SQL Editor output |
| 4 | RLS policies correctly configured | ✅ Enforcement verified live; ⏳ exact definitions pending SQL Editor output |
| 5 | `search_concept_id()` behaves correctly (exact/typo/unknown/null) | ⏳ Pending SQL Editor output |
| 6 | `PostgresKnowledgeProvider` reads correctly | ✅ Verified at code level; ⏳ live round trip pending |
| 7 | `TrigramConceptSearchProvider` resolves concepts correctly | ✅ Verified at code level; ⏳ live round trip pending |
| 8 | Planning Agent builds a `LearningPlan` from DB-backed data | ✅ Verified at code level; ⏳ live round trip pending |
| 9 | No M0–M4 regression | ✅ Verified live |
| 10 | End-to-end test using seeded NCERT curriculum | ⏳ Not yet performed |
| 11 | Application builds successfully | ✅ Clean `npm run build` |
| 12 | Documentation complete | ✅ M5-01/02/03 complete; `09_Curriculum_Foundation.md`, `08_Roadmap.md`, README updated |
| 13 | No stray TODOs / incomplete work | ✅ None found |

**Verdict: M5 is substantially verified but not yet closed.** Architecture, code-level logic, and everything reachable without an authenticated live session all check out. Closure is gated on exactly two things: the SQL Editor script's output, and one live authenticated end-to-end test (mirroring M1-07's precedent). Once either is provided, this report should be updated to a full ✅ close.
