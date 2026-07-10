# M5-01 — Curriculum Persistence (M5A)

**Status:** ✅ Completed
**Date:** 2026-07-11

**Note on scope:** M5A and M5B ([M5-02](M5-02-Retrieval-Intelligence.md)) were implemented in the same work session, since splitting `KnowledgeProvider`'s search responsibility out into a separate `ConceptSearchProvider` is one atomic interface change spanning both — `buildPlanningContext()`'s signature and the deletion of M3's static dataset only make sense together. They're documented separately because they're two genuinely different concerns (storage vs. search), per the product owner's explicit phasing.

---

## Objective

Replace M3's static, in-code `StaticCurriculumProvider` with a real Postgres-backed `KnowledgeProvider` implementation — migrating `09_Curriculum_Foundation.md`'s model into normalized relational tables, supporting multiple grades/subjects/chapters, with the `KnowledgeProvider` interface itself unchanged in spirit (its search method moved out, per M5B, but its structured-lookup methods keep the exact same shape Planning Agent already depends on).

---

## Why This Task Exists

M3 deliberately built `StaticCurriculumProvider` as a temporary, single-chapter implementation specifically so a real one could replace it later without touching Planning Agent. M5 is that later — per `08_Roadmap.md`, Knowledge Retrieval Agent's job. Real persistence needed to exist before any richer content (more chapters, more subjects) could be added.

---

## Requirements

- Migrate `09_Curriculum_Foundation.md`'s Part A/B/C model into real Postgres tables.
- Support multiple grades, subjects, and chapters going forward (not hardcoded to the one seeded chapter).
- No embeddings or vector search in this phase — that's explicitly out of scope (see M5-02 and the M5 gate review for why).
- `KnowledgeProvider`'s structured-lookup methods keep the same contract Planning Agent already depends on.
- No downstream agent (Router, Planning's decision logic, Personalization) changes.

---

## Architecture Decisions

- **Text primary keys, not `uuid`**, throughout the new schema — deliberately unlike `profiles`/`conversations`/`messages`/`events`. Curriculum content is authored, versioned reference data where stable, human-readable IDs (`addition-with-regrouping`) matter for content authoring and cross-referencing; runtime user data doesn't have that need.
- **RLS grants `SELECT` to any `authenticated` user, with no write policy.** Curriculum content is shared reference data, not per-student data — every signed-in student can read all of it. Content authoring happens via migrations run with direct database access, not through the app's RLS-scoped client, the same reasoning `events`' insert-only RLS already established in the opposite direction (M0-03).
- **Two-step queries, not embedded Postgrest joins.** `getPrerequisites()`, `getLearningObjectives()`, etc. fetch related IDs first, then fetch rows by ID, rather than relying on exact foreign-key constraint names in embedded join syntax — more verbose, but doesn't break if a constraint is renamed, and mirrors the simplicity M3's in-memory Map lookups already had.
- **Every `KnowledgeProvider` method fails soft** (returns `null`/`[]` on a query error) rather than throwing — curriculum reads are a non-critical enhancement layered on M1's reply generation, the same resilience posture `rate-limit.ts` and `router-agent.ts` already established.
- **Learning Resources (`09_Curriculum_Foundation.md` A6) were not migrated** — no content type needing them exists yet in the seeded dataset; additive whenever real resource content is authored, not built ahead of a need.
- **The seed data is a separate migration file** (`0003_seed_ncert_class3_math_addition_subtraction.sql`) from the schema (`0002_curriculum_foundation.sql`) — schema evolution and content additions are different kinds of change with different review needs; a future second chapter is a new seed migration, not a schema change.

---

## Files Created

- `web/supabase/migrations/0002_curriculum_foundation.sql` — schema: `subjects`, `grades`, `chapters`, `concepts`, `concept_relationships`, `learning_objectives`, `concept_learning_objectives`, `misconceptions`, `teaching_strategies`, `mastery_criteria`, all RLS-enabled with an authenticated-read-only policy. Also enables `pg_trgm` and defines `search_concept_id()` (M5B's function — added here since it lives in the same schema migration).
- `web/supabase/migrations/0003_seed_ncert_class3_math_addition_subtraction.sql` — the same content M3's static dataset authored, now as seed data.
- `web/src/lib/knowledge/postgres-knowledge-provider.ts` — `createPostgresKnowledgeProvider(supabase)`.

## Files Modified

- `web/src/lib/knowledge/knowledge-provider.ts` — `findConceptByTopic()` removed (moved to `ConceptSearchProvider`, see M5-02); `getConcept(conceptId)` added, since something now needs to fetch a concept's details after search resolves an ID separately.

## Files Deleted

- `web/src/lib/knowledge/static-curriculum-provider.ts` and `web/src/lib/knowledge/datasets/ncert-class3-math-addition-subtraction.ts` — fully superseded; kept until M5B's provider was also ready rather than left as dead code in between.

---

## Database Changes

Ten new tables (see Files Created above), all RLS-enabled, no destructive changes to existing M0–M4 schema. This is the first schema migration since M0-03 — M1 through M4 all deliberately avoided one.

---

## API Changes

None directly — `/api/chat`'s response shape is unchanged. Internally, the route's composition root now constructs `PostgresKnowledgeProvider` per-request (it needs the request's RLS-scoped Supabase client) instead of a module-scope static instance.

---

## Testing Performed

- **13 unit assertions against `PostgresKnowledgeProvider`**, using a mocked Supabase client (chainable `.from().select().eq().in().maybeSingle()`, matching the real client's shape): `getConcept` found/not-found/error-fails-soft, `getPrerequisites` correctly resolving only `prerequisite_of` edges (not `builds_on`) and returning empty when none exist, `getLearningObjectives` correctly populating a multi-concept objective's full `conceptIds` (not just the concept the query was scoped by), and field-mapping correctness (snake_case DB columns → camelCase domain types, `null` → `undefined`) for `getMisconceptions`/`getTeachingStrategies`/`getMasteryCriteria`.
- `npm run build` — clean, zero TypeScript errors.
- Dev server smoke test — unauthenticated `/api/chat` still returns `401`.
- **Not yet verified live against the real database** — applying this migration requires direct SQL Editor access (no service-role key or CLI link available in this environment, same constraint noted in M0-03's own history); see Open Issues.

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| Curriculum Foundation model migrated to real Postgres tables | ✅ Schema written, covers all of Part A/B/C except unused Learning Resources |
| Supports multiple grades/subjects/chapters | ✅ Schema is not hardcoded to one chapter; only seed data is |
| No embeddings/vector search introduced | ✅ Met — `pg_trgm` only, no embedding column or provider |
| `KnowledgeProvider`'s structured methods keep the same contract | ✅ Only `findConceptByTopic` moved out; all ID-based lookups unchanged in shape |
| No downstream agent changes | ✅ `decidePlan`/`decidePersonalization` verified unaffected (see M5-02's tests) |
| Clean build | ✅ Met |

---

## Lessons Learned

- Writing the RLS policy for genuinely shared, non-sensitive reference data (read-only for any authenticated user) was a different shape of decision than every prior RLS policy in this project (all previously scoped to `auth.uid()` ownership) — worth recognizing "this data isn't owned by anyone in particular" as its own category rather than forcing an ownership-shaped policy onto it.
- Two-step queries instead of embedded joins cost a small amount of round-trip latency but bought real independence from foreign-key constraint naming — worth the trade at this scale.

---

## Open Issues

- **This migration has not been applied to the live database yet** — no service-role key or linked Supabase CLI project is available in this environment. Needs to be run via the Supabase Dashboard SQL Editor (the same path M0-03 used for the original schema), or a service-role key provided for a scripted push.
- Learning Resources (A6) remain unmigrated — additive whenever real resource content exists.
- Carried from M3: the seeded dataset still covers only one chapter.

---

## Next Task

[M5-02 — Retrieval Intelligence](M5-02-Retrieval-Intelligence.md)
