import { createClient } from "@/lib/supabase/server";
import { generateTraceId, logEvent } from "@/lib/observability/trace";
import { sanitizePayload } from "@/lib/voice/voice-event-payload";


/**
 * Lifecycle events only the browser can observe. Each event is whitelisted
 * and its payload rebuilt field by field, so this route can't be used to
 * write arbitrary audit rows. Carries no audio, transcript, or video data.
 */
export async function POST(request: Request) {
  const traceId = generateTraceId();
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  const studentId = claimsData.claims.sub as string;

  const body = await request.json().catch(() => null);
  const eventName = typeof body?.eventName === "string" ? body.eventName : "";
  const payload = sanitizePayload(eventName, body?.payload);
  if (!payload) {
    return Response.json({ error: "Unknown event." }, { status: 400 });
  }

  await logEvent(supabase, { traceId, eventName, studentId, payload });
  return Response.json({ ok: true });
}
