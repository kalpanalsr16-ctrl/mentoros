import * as Sentry from "@sentry/nextjs";
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
 * Writes one row to the events audit log. Never throws, for either a
 * returned error or a thrown exception (for example a network failure): a
 * failure to log must never break the feature it's observing (the same
 * principle 13_Evaluation_Agent.md states for evaluation). A failed write is
 * reported to Sentry and the server log, and is not retried as an event,
 * which would recurse into the same failing writer.
 */
export async function logEvent(
  supabase: SupabaseServerClient,
  { traceId, eventName, studentId, conversationId = null, payload = {} }: LogEventParams,
): Promise<void> {
  try {
    const { error } = await supabase.from("events").insert({
      trace_id: traceId,
      event_name: eventName,
      student_id: studentId,
      conversation_id: conversationId,
      payload,
    });

    if (error) reportObservabilityFailure(eventName, error.message);
  } catch (err) {
    reportObservabilityFailure(eventName, err instanceof Error ? err.message : "unknown error");
  }
}

export type ObservabilityFailureReporter = (eventName: string, message: string) => void;

const sentryFailureReporter: ObservabilityFailureReporter = (eventName, message) => {
  Sentry.captureMessage(`events write failed: ${eventName}`, {
    level: "error",
    tags: { component: "observability" },
    extra: { message },
  });
};

let failureReporter: ObservabilityFailureReporter = sentryFailureReporter;

/** Test seam: swap the reporter, then pass `null` to restore Sentry. */
export function setObservabilityFailureReporter(reporter: ObservabilityFailureReporter | null): void {
  failureReporter = reporter ?? sentryFailureReporter;
}

function reportObservabilityFailure(eventName: string, message: string): void {
  console.error(`[events] failed to log "${eventName}":`, message);
  failureReporter(eventName, message);
}
