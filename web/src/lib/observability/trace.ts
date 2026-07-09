import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * One trace ID groups every event produced while handling a single
 * request/response cycle, per 14_Event_Driven_Architecture.md.
 */
export function generateTraceId(): string {
  return crypto.randomUUID();
}

type LogEventParams = {
  traceId: string;
  eventName: string;
  studentId: string;
  conversationId?: string | null;
  payload?: Record<string, unknown>;
};

/**
 * Writes one row to the events audit log. Never throws — a failure to
 * log must never break the feature it's observing (the same principle
 * 13_Evaluation_Agent.md states for evaluation: "Evaluation should never
 * block learner interactions").
 */
export async function logEvent(
  supabase: SupabaseServerClient,
  { traceId, eventName, studentId, conversationId = null, payload = {} }: LogEventParams,
): Promise<void> {
  const { error } = await supabase.from("events").insert({
    trace_id: traceId,
    event_name: eventName,
    student_id: studentId,
    conversation_id: conversationId,
    payload,
  });

  if (error) {
    console.error(`[events] failed to log "${eventName}":`, error.message);
  }
}
