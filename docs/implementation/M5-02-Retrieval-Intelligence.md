# M5-02 — Retrieval Intelligence (M5B)

**Status:** ✅ Completed
**Date:** 2026-07-11

**Note on scope:** implemented alongside M5A ([M5-01](M5-01-Curriculum-Persistence.md)) in the same work session — see that document's scope note for why.

---

## Objective

Improve `findConceptByTopic()`'s matching quality independently of curriculum storage: introduce a dedicated `ConceptSearchProvider` abstraction so search can evolve on its own timeline, and implement it with Postgres trigram search — a real improvement over M3's exact-name-only matching, without introducing an embedding provider.

---

## Why This Task Exists

M3's `findConceptByTopic()` matched only on exact (case-insensitive) concept name — a real, documented limitation. The roadmap originally described M5 as introducing real *semantic* retrieval via the vector database `06_Technical_Architecture.md` names. Before implementing that, the actual embedding model/provider that would back it turned out to be undocumented anywhere — a real gap, not a detail to guess past. Rather than pick a vendor unilaterally or silently keep exact-match-only search, this task separates the concern (search) from the concern it was bundled with (storage), and improves it with what Postgres already provides for free.

---

## Requirements

- `findConceptByTopic()`'s replacement must live behind its own interface, separate from `KnowledgeProvider`, so it can be replaced independently later.
- The first real implementation must be a genuine improvement over exact-name matching, without requiring a new external vendor/API key.
- No downstream agent (Planning, Personalization) may need to change when a future semantic-search implementation replaces this one.
- The embedding-provider decision must be explicitly deferred, not silently resolved either way.

---

## Architecture Decisions

- **`ConceptSearchProvider` is a new, single-method interface** (`findConceptIdByTopic`) — returns a concept *ID*, not a full `Concept`, since resolving the ID into full details is `KnowledgeProvider.getConcept()`'s job. This is the direct implementation of the M5 design agreement's provider split.
- **Matching logic lives in a Postgres function (`search_concept_id`), not in TypeScript.** Exact case-insensitive name match first (preserving M3's original behavior exactly when it would have matched), falling back to `pg_trgm` similarity (threshold `0.3`, highest-similarity match wins) when no exact match exists. Doing this in SQL means the fuzzy-matching logic runs where the data lives, rather than pulling every concept's name into the application layer to compare in TypeScript.
- **`TrigramConceptSearchProvider` is a thin wrapper calling this function via `supabase.rpc()`** — the TypeScript layer has no matching logic of its own to get subtly wrong; correctness lives in one place (the SQL function), and the TypeScript side is basically un-mockable-incorrectly (it just passes parameters through and maps the result).
- **The embedding-provider decision is explicitly deferred, documented in three places** (this doc, `09_Curriculum_Foundation.md`'s Storage Mapping, and `08_Roadmap.md`'s M5 entry) rather than silently resolved — `06_Technical_Architecture.md` never specified an embedding model, and MentorOS's current one-chapter curriculum scale doesn't yet create a real, felt problem trigram search can't solve.
- **`buildPlanningContext()` now takes both providers as separate parameters** and performs the two-step resolution explicitly (`findConceptIdByTopic` → `getConcept`) — the composition root (`/api/chat`) wires both; Planning Agent's own decision logic (`decidePlan`, `decidePersonalization`) never sees either provider.

---

## Files Created

- `web/src/lib/knowledge/concept-search-provider.ts` — the `ConceptSearchProvider` interface.
- `web/src/lib/knowledge/trigram-concept-search-provider.ts` — `createTrigramConceptSearchProvider(supabase)`.

## Files Modified

- `web/supabase/migrations/0002_curriculum_foundation.sql` — includes `search_concept_id()` (see M5-01; documented here since this is the phase it actually serves) plus a trigram GIN index on `concepts.name`.
- `web/src/lib/agents/planning-agent.ts` — `buildPlanningContext()` gained a `conceptSearchProvider` parameter; now calls `findConceptIdByTopic()` then `getConcept()` instead of the old single-call `findConceptByTopic()`.
- `web/src/app/api/chat/route.ts` — composition root now also constructs `TrigramConceptSearchProvider` per-request and passes it into `buildPlanningContext()`.

---

## Database Changes

None beyond what M5-01 already introduced (`search_concept_id()` and the trigram index live in the same migration file).

---

## API Changes

None — same as M5-01.

---

## Testing Performed

- **7 unit assertions against `TrigramConceptSearchProvider`**, mocked Supabase client: undefined topic short-circuits without ever calling `rpc` (verified via call-count), a successful match returns the resolved ID and calls the RPC with the exact expected `search_topic`/`search_subtopic` parameters, no-subtopic passes `null` (not `undefined`) to match the SQL function's default parameter handling, a no-match result and an RPC error both fail soft to `null`.
- **4 additional assertions re-verifying `buildPlanningContext()`** against the new split-provider signature: the search→lookup round trip correctly resolves a concept, and — critically — when search finds no match, `getConcept` and every concept-dependent `KnowledgeProvider` method are never even called (mocks configured to throw if invoked), confirming the "skip entirely when unresolved" behavior M3 established still holds.
- **Confirmed `decidePlan()` produces identical output** when run against a `PlanningContext` assembled through the new two-provider path — direct evidence that Planning Agent's own decision logic is genuinely unaffected by this change, not just an assertion in the design doc.
- Safety regression (24 phrases) re-run and passing; structural re-verification that the unsafe branch still cannot reach any Claude call.
- `npm run build` — clean, zero TypeScript errors.
- Dev server smoke test — unauthenticated `/api/chat` still returns `401`.
- No `TODO`/`FIXME`/`XXX` markers found in `web/src`.
- **`search_concept_id()`'s actual trigram-matching behavior has not been verified against a live database** — same blocker as M5-01 (migration not yet applied); the mocked tests prove the TypeScript wrapper's logic, not the SQL function's real matching quality.

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| Search lives behind its own interface, separate from `KnowledgeProvider` | ✅ `ConceptSearchProvider` has zero overlap with `KnowledgeProvider`'s methods |
| Real improvement over exact-name matching, no new vendor | ✅ `pg_trgm`, already available in Postgres, no new API key |
| No downstream agent needs to change for a future semantic-search swap | ✅ Verified directly — `decidePlan`'s output is identical across the old and new assembly paths |
| Embedding-provider decision explicitly deferred, not silently resolved | ✅ Documented in three cross-referenced places |
| Clean build | ✅ Met |

---

## Lessons Learned

- Putting fuzzy-matching logic in a SQL function rather than TypeScript meant the application-layer code became nearly impossible to get subtly wrong — there's no threshold or scoring logic in TypeScript to test exhaustively, only parameter pass-through and result mapping.
- Directly testing that `decidePlan()` produces the *same* output across the old (M3) and new (M5) context-assembly paths was stronger evidence of "no downstream agent changes" than reasoning about the type signatures alone — worth doing whenever a refactor's whole point is "callers shouldn't notice."

---

## Open Issues

- **The migration (including `search_concept_id()`) has not been applied to the live database** — same blocker as M5-01, needs manual application via the Supabase SQL Editor or a provided service-role key.
- **Trigram similarity is a real, accepted limitation** — a topic phrased as a genuine paraphrase or synonym of a concept's name (not just a typo or partial match) may still fail to resolve. This is expected, not a bug, and the threshold (`0.3`) is a first guess, not tuned against real query data.
- The embedding-provider decision remains genuinely open — revisit once real curriculum scale (multiple chapters/subjects) makes trigram search's limits a felt problem.

---

## Next Task

M5 gate review, mirroring M0–M4's milestone closure process.
