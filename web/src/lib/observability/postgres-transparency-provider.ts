import type { createClient } from "@/lib/supabase/server";
import type { EventRow } from "@/lib/agents/observability-agent";
import {
  buildTraceView,
  findVoiceTraceId,
  type TransparencyProvider,
  type TraceView,
} from "@/lib/observability/transparency-provider";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const COLUMNS = "event_name, payload, created_at, conversation_id, student_id";

/**
 * Reads `events` through the caller's own RLS-scoped session client (the
 * self-read policy added in 0006_events_self_read.sql) -- a student's
 * client can only ever see rows where `student_id = auth.uid()`, so this
 * function needs no manual ownership check of its own; an unrelated or
 * nonexistent traceId simply comes back with zero rows.
 *
 * A voice turn's transcription and timing events carry the voice trace ID
 * rather than the chat trace ID, so they are joined in a second query. The
 * ID is validated as a UUID before it goes into the filter.
 */
export function createPostgresTransparencyProvider(supabase: SupabaseServerClient): TransparencyProvider {
  return {
    async getTraceView(traceId: string): Promise<TraceView | null> {
      const { data } = await supabase.from("events").select(COLUMNS).eq("trace_id", traceId);
      const events = (data ?? []) as EventRow[];

      const voiceTraceId = findVoiceTraceId(events);
      let voiceEvents: EventRow[] = [];
      if (voiceTraceId) {
        const { data: voiceData } = await supabase
          .from("events")
          .select(COLUMNS)
          .or(`trace_id.eq.${voiceTraceId},payload->>voiceTraceId.eq.${voiceTraceId}`);
        voiceEvents = (voiceData ?? []) as EventRow[];
      }

      return buildTraceView(traceId, events, voiceEvents);
    },
  };
}
