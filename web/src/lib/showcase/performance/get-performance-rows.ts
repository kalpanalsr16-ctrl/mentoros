import type { createClient } from "@/lib/supabase/server";
import type { PerfRow, Traffic } from "@/lib/showcase/performance/performance-metrics";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type RpcRow = {
  trace_id: string;
  event_name: string;
  created_at: string;
  traffic: Traffic;
  model: string | null;
  latency_ms: number | string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  wall_clock_ms: number | string | null;
  modality: string | null;
  voice_question_to_transcript_ms: number | string | null;
  voice_transcript_to_reply_ms: number | string | null;
  voice_reply_to_audio_ms: number | string | null;
  voice_total_ms: number | string | null;
  avatar_status: string | null;
};

const num = (v: number | string | null): number | null => (v === null ? null : Number(v));

/**
 * PostgREST caps each response (1000 rows by default), so the loader pages
 * through the result. The order makes offsets stable between pages.
 */
const PAGE_SIZE = 1000;

/**
 * Calls showcase_performance_rows(), which checks ai_showcase_access in SQL.
 * Returns null if the call fails, including for an account without access.
 */
export async function getPerformanceRows(supabase: SupabaseServerClient): Promise<PerfRow[] | null> {
  const all: RpcRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .rpc("showcase_performance_rows")
      .order("created_at")
      .order("trace_id")
      .order("event_name")
      .range(from, from + PAGE_SIZE - 1);
    if (error || !Array.isArray(data)) return null;
    if (data.length === 0) break;
    all.push(...(data as RpcRow[]));
  }
  return all.map((r) => ({
    traceId: r.trace_id,
    eventName: r.event_name,
    createdAt: r.created_at,
    traffic: r.traffic,
    model: r.model,
    latencyMs: num(r.latency_ms),
    inputTokens: r.input_tokens,
    outputTokens: r.output_tokens,
    wallClockMs: num(r.wall_clock_ms),
    modality: r.modality,
    voiceQuestionToTranscriptMs: num(r.voice_question_to_transcript_ms),
    voiceTranscriptToReplyMs: num(r.voice_transcript_to_reply_ms),
    voiceReplyToAudioMs: num(r.voice_reply_to_audio_ms),
    voiceTotalMs: num(r.voice_total_ms),
    avatarStatus: r.avatar_status,
  }));
}
