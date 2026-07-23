import { test } from "node:test";
import assert from "node:assert/strict";
import { createPostgresCurriculumProvider } from "@/lib/curriculum/postgres-curriculum-provider";

type MockResponse = { data: unknown[] | null; error: unknown };

function mockSupabase(response: MockResponse, captureIlike?: (column: string, pattern: string) => void) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    ilike: (column: string, pattern: string) => {
      captureIlike?.(column, pattern);
      return builder;
    },
    limit: () => Promise.resolve(response),
  };
  return { from: () => builder } as unknown as Parameters<typeof createPostgresCurriculumProvider>[0];
}

test("source is 'postgres'", () => {
  const provider = createPostgresCurriculumProvider(mockSupabase({ data: [], error: null }));
  assert.equal(provider.source, "postgres");
});

test("search returns [] for an empty/whitespace query without hitting the database", () => {
  let called = false;
  const supabase = mockSupabase({ data: [], error: null }, () => {
    called = true;
  });
  const provider = createPostgresCurriculumProvider(supabase);
  return provider.search("   ").then((result) => {
    assert.deepEqual(result, []);
    assert.equal(called, false);
  });
});

test("search maps rows to CurriculumSearchResult, mapping curriculum_standard_reference to standardCode", async () => {
  const supabase = mockSupabase({
    data: [
      { id: "addition-without-regrouping", name: "Addition without regrouping", curriculum_standard_reference: "NCERT-3-M-1.2" },
      { id: "some-concept", name: "Some concept", curriculum_standard_reference: null },
    ],
    error: null,
  });
  const provider = createPostgresCurriculumProvider(supabase);
  const results = await provider.search("addition");
  assert.deepEqual(results, [
    { id: "addition-without-regrouping", name: "Addition without regrouping", source: "postgres", standardCode: "NCERT-3-M-1.2" },
    { id: "some-concept", name: "Some concept", source: "postgres", standardCode: undefined },
  ]);
});

test("search fails soft (returns []) on a query error, never throws", async () => {
  const supabase = mockSupabase({ data: null, error: { message: "connection reset" } });
  const provider = createPostgresCurriculumProvider(supabase);
  const results = await provider.search("addition");
  assert.deepEqual(results, []);
});

test("search escapes ILIKE wildcard characters so a literal query isn't treated as a pattern", async () => {
  let capturedPattern = "";
  const supabase = mockSupabase({ data: [], error: null }, (_column, pattern) => {
    capturedPattern = pattern;
  });
  const provider = createPostgresCurriculumProvider(supabase);
  await provider.search("50%_off");
  assert.equal(capturedPattern, "%50\\%\\_off%");
});
