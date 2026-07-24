import type { createClient } from "@/lib/supabase/server";
import type { EventRow } from "@/lib/agents/observability-agent";
import { buildTraceView, type TransparencyProvider, type TraceView } from "@/lib/observability/transparency-provider";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Reads `events` through the caller's own RLS-scoped session client (the
 * self-read policy added in 0006_events_self_read.sql) -- a student's
 * client can only ever see rows where `student_id = auth.uid()`, so this
 * function needs no manual ownership check of its own; an unrelated or
 * nonexistent traceId simply comes back with zero rows.
 */
export function createPostgresTransparencyProvider(supabase: SupabaseServerClient): TransparencyProvider {
  return {
    async getTraceView(traceId: string): Promise<TraceView | null> {
      const { data } = await supabase
        .from("events")
        .select("event_name, payload, created_at, conversation_id, student_id")
        .eq("trace_id", traceId);

      return buildTraceView(traceId, (data ?? []) as EventRow[]);
    },
  };
}
