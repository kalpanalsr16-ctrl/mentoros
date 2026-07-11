# M5-03 — Production Verification

**Status:** ✅ Completed
**Date:** 2026-07-11

**Post-report update (same day):** the two items originally left pending below — the SQL Editor script's output (row counts, FK integrity, RLS policy definitions, `search_concept_id()` behavior) and a live authenticated end-to-end test — were both completed directly by the product owner against production. Their confirmation: *"Yes I have verified all the entries and details it is working fine."* Same evidentiary pattern as [M1-07](M1-07-Manual-End-to-End-Verification.md), which also closed on a product owner's direct confirmation rather than a pasted transcript. All 10 checklist items are now considered verified; M5 is fully closed (see [M5 Completion Report](../milestones/M5_Completion.md)).

---

## Objective

Verify that M5A/M5B ([M5-01](M5-01-Curriculum-Persistence.md), [M5-02](M5-02-Retrieval-Intelligence.md)) actually work against the real production Supabase database, now that `0002_curriculum_foundation.sql` and `0003_seed_ncert_class3_math_addition_subtraction.sql` have been applied — not just against mocks, per the product owner's explicit request before M5 is closed.

---

## Constraint This Verification Ran Under

This environment has only the app's **anon key** — no service-role key, no linked Supabase CLI project, no direct Postgres connection string (same constraint noted throughout M0–M5). Every curriculum table's RLS policy is `to authenticated`, so anon requests are correctly filtered to zero rows by design — proving RLS works, but also meaning row-level facts (counts, FK integrity, `search_concept_id()` behavior) can't be read as anon.

Creating a disposable test account to get a real authenticated session (the scripted approach M1-07 originally tried) was attempted and blocked by the environment's auto-mode classifier as a write against shared production infrastructure the product owner hadn't explicitly authorized. Offered three alternatives; the product owner chose to run the read-only SQL script directly and separately performed a live authenticated end-to-end test, then confirmed both directly (see the Post-report update above).

---

## Verification Checklist (as requested)

| # | Check | Method | Result |
|---|---|---|---|
| 1 | All curriculum tables exist | Anon-key REST call to each of the 10 tables (`/rest/v1/<table>?select=*&limit=1`) | ✅ **Verified live** — all 10 returned `200 []` (previously `404 PGRST205` before migration) |
| 2 | Seed data exists in every expected table | SQL Editor script, run by the product owner | ✅ **Verified** — product owner confirmed |
| 3 | Foreign-key relationships valid | SQL Editor script, run by the product owner | ✅ **Verified** — product owner confirmed |
| 4 | RLS policies correctly configured | Anon-key REST (enforcement, verified live directly) + SQL Editor (`pg_policies`, exact cmd/roles/qual, run by product owner) | ✅ **Verified** |
| 5 | `search_concept_id()` SQL function works correctly | SQL Editor script (exact match, typo fallback, unknown, null-input cases), run by the product owner | ✅ **Verified** — product owner confirmed |
| 6 | `PostgresKnowledgeProvider` reads successfully from the live database | Mocked Supabase client, matching the real client's chainable shape, exercised against the exact seeded dataset's values | ✅ **Verified at the code level** (5/5 assertions) — not a live network round trip; see Open Issues |
| 7 | `TrigramConceptSearchProvider` resolves seeded concepts correctly | Mocked `rpc()`, verifying exact parameter pass-through and fail-soft behavior | ✅ **Verified at the code level** (6/6 assertions) — not a live network round trip |
| 8 | Planning Agent retrieves curriculum data through the new provider abstraction | `buildPlanningContext()` + `decidePlan()` run against a hand-built context shaped like the seeded dataset | ✅ **Verified at the code level** (5/5 assertions, including the unresolved-topic skip path) — not a live network round trip |
| 9 | M0–M4 functionality has no regressions | Anon-key REST on `profiles`/`conversations`/`messages`/`events`; safety-filter regression suite; live `/api/chat` and `/api/health` calls against the local dev server | ✅ **Verified live** |
| 10 | End-to-end test using the seeded NCERT curriculum | Real authenticated session, product owner directly | ✅ **Verified** — product owner confirmed, mirroring [M1-07](M1-07-Manual-End-to-End-Verification.md)'s pattern |

---

## Detail: What Was Actually Run

### 1. Table existence + RLS enforcement (live, anon key)

```
subjects -> 200 []
grades -> 200 []
chapters -> 200 []
concepts -> 200 []
concept_relationships -> 200 []
learning_objectives -> 200 []
concept_learning_objectives -> 200 []
misconceptions -> 200 []
teaching_strategies -> 200 []
mastery_criteria -> 200 []
```

Before the migration was applied, the same call returned `404 {"code":"PGRST205", "message":"Could not find the table..."}` for every one of these. After, all ten return `200` with an empty array — table exists, RLS correctly denies anon (no policy targets the `anon` role; every policy is scoped `to authenticated`).

### 2. `npm run build`

Clean, zero TypeScript errors, re-run fresh after the migration was confirmed applied.

### 3. `PostgresKnowledgeProvider` (mocked, 5 assertions)

Against a hand-built in-memory mirror of the exact seeded rows (`0003_seed_ncert_class3_math_addition_subtraction.sql`):
- `getConcept("addition-with-regrouping")` resolves the seeded concept; unknown id returns `null`.
- `getPrerequisites("subtraction-with-regrouping")` returns only the `prerequisite_of` edge (`subtraction-without-regrouping`), correctly excluding the `builds_on` edge from `addition-with-regrouping`.
- `getLearningObjectives("addition-with-regrouping")` correctly populates `lo-word-problem-add-sub`'s full `conceptIds` (both `addition-with-regrouping` and `subtraction-with-regrouping`), not just the concept the query was scoped by.
- `getMisconceptions` maps `null` `source`/`last_reviewed_by` to `undefined`, per the C2 metadata profile.

### 4. `TrigramConceptSearchProvider` (mocked, 6 assertions)

- A resolved match returns the correct id and calls `rpc("search_concept_id", ...)` with the exact expected `search_topic`/`search_subtopic` parameters (`null`, not `undefined`, when no subtopic given).
- `subtopic` is passed through and takes precedence when both are given.
- An `undefined` topic short-circuits to `null` without ever calling `rpc`.
- Both a no-match result and an RPC error fail soft to `null`.

### 5. Planning Agent end-to-end (mocked, 5 assertions)

- `buildPlanningContext()` correctly performs the search → lookup round trip (`findConceptIdByTopic` → `getConcept`) and populates `learningObjectives`/`misconceptions`/`teachingStrategies` for the resolved concept.
- `decidePlan()` produces `ConceptFirst` for a known learner with no recorded attempts on the resolved concept — correct per the M3 decision tree.
- When the topic doesn't resolve, `getConcept` and every concept-dependent `KnowledgeProvider` method are never even called (mocks configured to throw if invoked) and `decidePlan()` correctly falls back to `Diagnostic` — confirming M3's "skip entirely when unresolved" behavior still holds through the new two-provider path.

### 6. Safety-filter regression (24 assertions)

18 unsafe phrases across all four categories (`self_harm`, `violence`, `sexual_content`, `prompt_injection`) plus 6 safe curriculum-related messages — all correctly classified, unaffected by M5.

### 7. Live M0–M4 spot checks

- `profiles`/`conversations`/`messages`/`events` still respond `200 []` via anon key, unchanged from pre-M5 behavior.
- Local dev server: unauthenticated `POST /api/chat` → `401 {"error":"Not signed in."}`; `GET /api/health` → `200`.

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| All 10 curriculum tables exist in production | ✅ Met |
| RLS correctly denies unauthenticated access | ✅ Met |
| Seed data present with correct row counts | ✅ Met (product owner confirmed) |
| Foreign-key integrity holds | ✅ Met (product owner confirmed) |
| RLS policy definitions match design (SELECT-only, `authenticated`, no write policy) | ✅ Met (enforcement verified live; definitions product-owner confirmed) |
| `search_concept_id()` handles exact match / typo / unknown / null correctly | ✅ Met (product owner confirmed) |
| `PostgresKnowledgeProvider` / `TrigramConceptSearchProvider` / Planning Agent logic correct | ✅ Met (code-level) |
| No M0–M4 regression | ✅ Met |
| Clean build | ✅ Met |

---

## Lessons Learned

- Anon-key REST calls are a genuinely useful zero-risk verification tool even without any authenticated session: a `404` → `200 []` transition after a migration is strong, unambiguous evidence the schema landed, and a persistent `200 []` on tables known to hold seed data is direct proof RLS is denying the right role — no credentials needed for either fact.
- This project's own precedent ([M1-07](M1-07-Manual-End-to-End-Verification.md)) already established that some checks are only meaningfully verifiable by a real human, signed in, using the real app — not worth re-fighting that constraint with more scripting; better to hand it off explicitly, the same way M1-07 did for the LLM-failure simulation.

---

## Open Issues

None remaining for M5 itself. Both items originally listed here (SQL Editor output; a live authenticated end-to-end test) were resolved by the product owner directly (see the Post-report update at the top of this document). Checks 6-8's code-level (mocked) verification was never re-run against a live network round trip in this environment specifically -- that gap is inherent to not having a service-role key or test-account authorization here, not something left undone by choice; the product owner's own live end-to-end pass is what actually closes it.

---

## Next Task

M5 is fully closed -- see [M5 Completion Report](../milestones/M5_Completion.md). Proceeding to M7 (Practice Agent + Assessment Agent).
