# M5-03 — Production Verification

**Status:** ⏳ Partially completed — automated/code-level checks done; two live confirmations still pending (see Open Issues)
**Date:** 2026-07-11

---

## Objective

Verify that M5A/M5B ([M5-01](M5-01-Curriculum-Persistence.md), [M5-02](M5-02-Retrieval-Intelligence.md)) actually work against the real production Supabase database, now that `0002_curriculum_foundation.sql` and `0003_seed_ncert_class3_math_addition_subtraction.sql` have been applied — not just against mocks, per the product owner's explicit request before M5 is closed.

---

## Constraint This Verification Ran Under

This environment has only the app's **anon key** — no service-role key, no linked Supabase CLI project, no direct Postgres connection string (same constraint noted throughout M0–M5). Every curriculum table's RLS policy is `to authenticated`, so anon requests are correctly filtered to zero rows by design — proving RLS works, but also meaning row-level facts (counts, FK integrity, `search_concept_id()` behavior) can't be read as anon.

Creating a disposable test account to get a real authenticated session (the scripted approach M1-07 originally tried) was attempted and blocked by the environment's auto-mode classifier as a write against shared production infrastructure the product owner hadn't explicitly authorized. Offered three alternatives; the product owner chose **"you run a SQL script, paste back results."** That SQL script was provided but its output has not yet been pasted back — see Open Issues for exactly what remains.

---

## Verification Checklist (as requested)

| # | Check | Method | Result |
|---|---|---|---|
| 1 | All curriculum tables exist | Anon-key REST call to each of the 10 tables (`/rest/v1/<table>?select=*&limit=1`) | ✅ **Verified live** — all 10 returned `200 []` (previously `404 PGRST205` before migration) |
| 2 | Seed data exists in every expected table | Requires authenticated read or SQL Editor (anon is correctly RLS-blocked) | ⏳ **Pending** — SQL Editor script provided, awaiting output |
| 3 | Foreign-key relationships valid | Requires SQL Editor (`left join ... where ... is null` orphan checks) | ⏳ **Pending** — same script |
| 4 | RLS policies correctly configured | Anon-key REST (existence/enforcement) + SQL Editor (`pg_policies`, exact cmd/roles/qual) | ✅ **Enforcement verified live** (anon correctly gets zero rows on every table); ⏳ **exact policy definition pending SQL Editor output** |
| 5 | `search_concept_id()` SQL function works correctly | Requires SQL Editor (function only callable with DB access) | ⏳ **Pending** — same script (exact match, typo fallback, unknown, null-input cases included) |
| 6 | `PostgresKnowledgeProvider` reads successfully from the live database | Mocked Supabase client, matching the real client's chainable shape, exercised against the exact seeded dataset's values | ✅ **Verified at the code level** (5/5 assertions) — not a live network round trip; see Open Issues |
| 7 | `TrigramConceptSearchProvider` resolves seeded concepts correctly | Mocked `rpc()`, verifying exact parameter pass-through and fail-soft behavior | ✅ **Verified at the code level** (6/6 assertions) — not a live network round trip |
| 8 | Planning Agent retrieves curriculum data through the new provider abstraction | `buildPlanningContext()` + `decidePlan()` run against a hand-built context shaped like the seeded dataset | ✅ **Verified at the code level** (5/5 assertions, including the unresolved-topic skip path) — not a live network round trip |
| 9 | M0–M4 functionality has no regressions | Anon-key REST on `profiles`/`conversations`/`messages`/`events`; safety-filter regression suite; live `/api/chat` and `/api/health` calls against the local dev server | ✅ **Verified live** |
| 10 | End-to-end test using the seeded NCERT curriculum | Requires a real authenticated session through the actual app | ⏳ **Not yet performed** — same authentication constraint as #2/#3/#5; recommend the same manual-verification pattern already used in [M1-07](M1-07-Manual-End-to-End-Verification.md) |

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
| Seed data present with correct row counts | ⏳ Pending SQL Editor output |
| Foreign-key integrity holds | ⏳ Pending SQL Editor output |
| RLS policy definitions match design (SELECT-only, `authenticated`, no write policy) | ⏳ Pending SQL Editor output (enforcement already confirmed) |
| `search_concept_id()` handles exact match / typo / unknown / null correctly | ⏳ Pending SQL Editor output |
| `PostgresKnowledgeProvider` / `TrigramConceptSearchProvider` / Planning Agent logic correct | ✅ Met (code-level) |
| No M0–M4 regression | ✅ Met |
| Clean build | ✅ Met |

---

## Lessons Learned

- Anon-key REST calls are a genuinely useful zero-risk verification tool even without any authenticated session: a `404` → `200 []` transition after a migration is strong, unambiguous evidence the schema landed, and a persistent `200 []` on tables known to hold seed data is direct proof RLS is denying the right role — no credentials needed for either fact.
- This project's own precedent ([M1-07](M1-07-Manual-End-to-End-Verification.md)) already established that some checks are only meaningfully verifiable by a real human, signed in, using the real app — not worth re-fighting that constraint with more scripting; better to hand it off explicitly, the same way M1-07 did for the LLM-failure simulation.

---

## Open Issues

1. **Seed row counts, FK integrity, exact RLS policy definitions, and `search_concept_id()`'s live behavior are unverified** — the consolidated read-only SQL script (table existence, row counts, orphan checks, `pg_policies`, `pg_trgm`/index existence, six `search_concept_id()` calls covering exact/typo/subtopic-precedence/unknown/null) was handed to the product owner to run in the Supabase Dashboard SQL Editor; output not yet returned as of this report.
2. **No live, authenticated end-to-end test has been performed** — checks 6-8 above are verified at the code level (mocked), not as an actual network round trip through a real signed-in session. Recommend the same manual pattern M1-07 used: sign in with a real account on the local dev server (or Production), ask a question naming a seeded concept (e.g. "Can you help me with addition with regrouping?"), and confirm the reply reflects a concept-first, curriculum-grounded response rather than the Diagnostic/no-concept-found fallback.
3. Both items above are the only things separating this report from a full close — once either is provided, M5 can move from "substantially verified" to "fully verified."

---

## Next Task

Once items 1-2 above are resolved: finalize [M5 Completion Report](../milestones/M5_Completion.md) as fully closed (currently drafted marking these two items as the explicit remaining gate).
