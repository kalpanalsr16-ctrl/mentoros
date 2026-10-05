import { test } from "node:test";
import assert from "node:assert/strict";
import { getPerformanceRows } from "@/lib/showcase/performance/get-performance-rows";

type Client = Parameters<typeof getPerformanceRows>[0];

/** Mimics PostgREST: applies the requested range, then caps each response at 1000 rows. */
function fakeSupabase(source: { rows?: unknown; error?: { message: string } }) {
  const ranges: Array<{ from: number; to: number }> = [];
  const client = {
    rpc: (name: string) => {
      assert.equal(name, "showcase_performance_rows");
      let from = 0;
      let to = 999;
      const chain = {
        order: () => chain,
        range: (f: number, t: number) => {
          from = f;
          to = t;
          return chain;
        },
        then: (resolve: (v: unknown) => unknown) => {
          ranges.push({ from, to });
          if (source.error) return resolve({ data: null, error: source.error });
          if (!Array.isArray(source.rows)) return resolve({ data: source.rows ?? null, error: null });
          const end = Math.min(to + 1, source.rows.length, from + 1000);
          return resolve({ data: source.rows.slice(from, end), error: null });
        },
      };
      return chain;
    },
  };
  return { client: client as unknown as Client, ranges };
}

const RPC_ROW = {
  trace_id: "11111111-2222-4333-8444-555555555555",
  event_name: "concept_explained",
  created_at: "2026-10-05T10:00:00Z",
  traffic: "other",
  model: "claude-opus-4-8",
  latency_ms: "9120",
  input_tokens: 1400,
  output_tokens: 300,
  wall_clock_ms: null,
  modality: null,
  voice_question_to_transcript_ms: null,
  voice_transcript_to_reply_ms: null,
  voice_reply_to_audio_ms: null,
  voice_total_ms: null,
  avatar_status: null,
};

test("a call refused by the database is treated as no data, never as zero", async () => {
  const { client } = fakeSupabase({ error: { message: "showcase access required" } });
  assert.equal(await getPerformanceRows(client), null);
});

test("a non-array response is treated as no data", async () => {
  const { client } = fakeSupabase({ rows: { unexpected: true } });
  assert.equal(await getPerformanceRows(client), null);
});

test("rows are mapped to numbers and keep their traffic class", async () => {
  const { client } = fakeSupabase({ rows: [RPC_ROW] });
  const [row] = (await getPerformanceRows(client)) ?? [];
  assert.equal(row.latencyMs, 9120);
  assert.equal(row.wallClockMs, null);
  assert.equal(row.traffic, "other");
  assert.equal(row.inputTokens, 1400);
});

test("the mapped row carries no student identifier", async () => {
  const { client } = fakeSupabase({ rows: [RPC_ROW] });
  const [row] = (await getPerformanceRows(client)) ?? [];
  assert.equal(Object.keys(row).some((k) => /student|user|email/i.test(k)), false);
});

test("every page is read when the database caps a response at 1000 rows", async () => {
  const rows = Array.from({ length: 1278 }, (_, i) => ({ ...RPC_ROW, trace_id: `t-${i}` }));
  const { client, ranges } = fakeSupabase({ rows });
  const loaded = await getPerformanceRows(client);
  assert.equal(loaded?.length, 1278);
  assert.equal(new Set(loaded?.map((r) => r.traceId)).size, 1278);
  assert.deepEqual(ranges.map((r) => r.from), [0, 1000, 2000]);
});

test("an empty result ends paging with no rows", async () => {
  const { client } = fakeSupabase({ rows: [] });
  assert.deepEqual(await getPerformanceRows(client), []);
});
