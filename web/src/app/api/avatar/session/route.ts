import { createClient } from "@/lib/supabase/server";
import { generateTraceId, logEvent } from "@/lib/observability/trace";
import { createTavusConversation, endTavusConversation } from "@/lib/avatar/tavus-client";
import { avatarSessionRegistry } from "@/lib/avatar/avatar-session-registry";
import { avatarSessionLimiter } from "@/lib/security/voice-limits";

/** Opens one Dr. Paws Echo conversation for the signed-in student. */
export async function POST() {
  const traceId = generateTraceId();
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  const studentId = claimsData.claims.sub as string;

  const limit = avatarSessionLimiter.check(studentId);
  if (limit.limited) {
    return Response.json({ error: "Dr. Paws is resting for a moment. Your text answers still work." }, { status: 429 });
  }

  // Tavus's free tier allows one concurrent conversation, so a session the
  // student left open (e.g. after a crash) must not block the new one.
  for (const staleConversationId of avatarSessionRegistry.takeAllFor(studentId)) {
    void endTavusConversation({ apiKey: process.env.TAVUS_API_KEY, conversationId: staleConversationId });
  }

  const result = await createTavusConversation({
    apiKey: process.env.TAVUS_API_KEY,
    conversationName: `MentorOS voice session ${new Date().toISOString()}`,
  });

  if (!result.ok) {
    await logEvent(supabase, {
      traceId,
      eventName: "avatar_failed",
      studentId,
      payload: { stage: "create", reason: result.reason },
    });
    return Response.json({ error: "Dr. Paws isn't available right now. Your text answers still work." }, { status: 502 });
  }

  avatarSessionRegistry.register(result.conversationId, studentId);
  await logEvent(supabase, {
    traceId,
    eventName: "avatar_session_started",
    studentId,
    payload: { conversationId: result.conversationId },
  });

  return Response.json({ conversationId: result.conversationId, conversationUrl: result.conversationUrl });
}

/** Ends a conversation this student owns. Unknown or foreign IDs are rejected. */
export async function DELETE(request: Request) {
  const traceId = generateTraceId();
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  const studentId = claimsData.claims.sub as string;

  const body = await request.json().catch(() => null);
  const conversationId = typeof body?.conversationId === "string" ? body.conversationId : "";
  if (!conversationId || !avatarSessionRegistry.isOwnedBy(conversationId, studentId)) {
    return Response.json({ error: "Session not found." }, { status: 404 });
  }

  const result = await endTavusConversation({
    apiKey: process.env.TAVUS_API_KEY,
    conversationId,
  });
  avatarSessionRegistry.remove(conversationId);

  await logEvent(supabase, {
    traceId,
    eventName: result.ok ? "avatar_session_ended" : "avatar_failed",
    studentId,
    payload: result.ok ? { conversationId } : { stage: "end", conversationId },
  });

  return Response.json({ ok: result.ok });
}
