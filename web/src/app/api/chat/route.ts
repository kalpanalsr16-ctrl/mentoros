import { createClient } from "@/lib/supabase/server";
import { generateTraceId, logEvent } from "@/lib/observability/trace";

export async function POST(request: Request) {
  const traceId = generateTraceId();
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    // No authenticated student to attach this event to, and the events
    // table's RLS policy requires student_id = auth.uid() -- an
    // unauthenticated attempt can't be logged there. Nothing to log.
    return Response.json({ error: "Not signed in.", traceId }, { status: 401 });
  }

  const studentId = claimsData.claims.sub as string;

  const body = await request.json().catch(() => null);
  const content =
    typeof body?.content === "string" ? body.content.trim() : "";
  const conversationId =
    typeof body?.conversationId === "string" ? body.conversationId : null;

  if (!content) {
    return Response.json(
      { error: "Message content is required.", traceId },
      { status: 400 },
    );
  }

  await logEvent(supabase, {
    traceId,
    eventName: "message_received",
    studentId,
    conversationId,
    payload: { contentLength: content.length },
  });

  let activeConversationId = conversationId;

  if (!activeConversationId) {
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .insert({ student_id: studentId })
      .select("id")
      .single();

    if (conversationError || !conversation) {
      await logEvent(supabase, {
        traceId,
        eventName: "message_rejected",
        studentId,
        payload: { reason: "conversation_create_failed" },
      });
      return Response.json(
        { error: "Could not start a new conversation.", traceId },
        { status: 500 },
      );
    }

    activeConversationId = conversation.id;
  }

  const { data: userMessage, error: userMessageError } = await supabase
    .from("messages")
    .insert({
      conversation_id: activeConversationId,
      role: "user",
      content,
    })
    .select("id, role, content")
    .single();

  if (userMessageError || !userMessage) {
    // Most likely cause: activeConversationId doesn't belong to this
    // student, and Row Level Security silently rejected the insert.
    await logEvent(supabase, {
      traceId,
      eventName: "message_rejected",
      studentId,
      conversationId: activeConversationId,
      payload: { reason: "user_message_save_failed" },
    });
    return Response.json(
      { error: "Could not save your message.", traceId },
      { status: 403 },
    );
  }

  const { data: assistantMessage, error: assistantMessageError } =
    await supabase
      .from("messages")
      .insert({
        conversation_id: activeConversationId,
        role: "assistant",
        content: buildPlaceholderReply(content),
      })
      .select("id, role, content")
      .single();

  if (assistantMessageError || !assistantMessage) {
    await logEvent(supabase, {
      traceId,
      eventName: "reply_failed",
      studentId,
      conversationId: activeConversationId,
      payload: {
        reason: "assistant_message_save_failed",
        userMessageId: userMessage.id,
      },
    });
    return Response.json(
      { error: "Could not save the reply.", traceId },
      { status: 500 },
    );
  }

  await logEvent(supabase, {
    traceId,
    eventName: "reply_sent",
    studentId,
    conversationId: activeConversationId,
    payload: {
      userMessageId: userMessage.id,
      assistantMessageId: assistantMessage.id,
    },
  });

  return Response.json({
    conversationId: activeConversationId,
    userMessage,
    assistantMessage,
    traceId,
  });
}

// No real teaching intelligence exists yet (that begins in Milestone M1).
// This placeholder exists purely to prove the full loop -- save, reply,
// save, display -- works end to end. It is deliberately honest about
// being a placeholder rather than pretending to be a real answer.
function buildPlaceholderReply(studentMessage: string): string {
  return `You said: "${studentMessage}"\n\nThis is a placeholder reply — MentorOS doesn't have real teaching intelligence yet. That begins in Milestone M1. This response confirms your message was saved and a reply was generated and saved back.`;
}
