import { createClient } from "@/lib/supabase/server";
import { generateTraceId, logEvent } from "@/lib/observability/trace";
import { checkMessageSafety, buildSafetyDeclineMessage } from "@/lib/safety/filter";
import { buildConversationContext } from "@/lib/agents/context-agent";
import { generateTeachingReply, classifyIntentWithClaude } from "@/lib/llm/client";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { classifyIntent } from "@/lib/agents/router-agent";

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

  // Checked before any other work -- every message now costs a real
  // Claude API call (M1-04), so a student over the limit shouldn't pay
  // for a safety check, a conversation lookup, or a message insert on a
  // request that's about to be rejected anyway.
  const rateLimitResult = await checkRateLimit(supabase);
  if (rateLimitResult.limited) {
    await logEvent(supabase, {
      traceId,
      eventName: "rate_limited",
      studentId,
      payload: { count: rateLimitResult.count },
    });
    return Response.json(
      { error: "You're sending messages too quickly. Please wait a moment and try again.", traceId },
      { status: 429 },
    );
  }

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

  const safetyCheck = checkMessageSafety(content);

  await logEvent(supabase, {
    traceId,
    eventName: safetyCheck.safe ? "message_received" : "safety_blocked",
    studentId,
    conversationId,
    payload: safetyCheck.safe
      ? { contentLength: content.length }
      : { category: safetyCheck.category, contentLength: content.length },
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

  // The unsafe message is still saved -- it's part of the real
  // conversation history and needs to be reviewable (a parent or
  // reviewer must be able to see what was said and how MentorOS
  // responded), even though the reply it gets is a decline, not the
  // usual placeholder.
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

  let replyContent: string;
  let llmMetadata: Record<string, unknown> = {};

  if (!safetyCheck.safe) {
    // Unsafe messages never reach Claude at all -- M0-08's filter is the
    // gate, not a pre-check the LLM could still be argued past. Zero
    // Anthropic API calls for blocked content, by design.
    replyContent = buildSafetyDeclineMessage(safetyCheck.category);
  } else {
    // Built after the user message above was saved, so the history the
    // model sees naturally ends with the message the student just sent.
    const history = await buildConversationContext(supabase, activeConversationId);

    // Router Agent (M2): intent analysis only -- it never generates a
    // teaching reply itself. It decides whether this message needs
    // clarification; when it doesn't, the existing M1 reply path below
    // runs unchanged. A router failure fails open into that same M1 path
    // rather than blocking the message, since routing is an enhancement
    // layered on top of M1, not a new hard dependency of the chat route.
    const routerResult = await classifyIntent(history, classifyIntentWithClaude);

    if (routerResult.success) {
      await logEvent(supabase, {
        traceId,
        eventName: "intent_detected",
        studentId,
        conversationId: activeConversationId,
        payload: {
          primaryIntent: routerResult.intent.primaryIntent,
          secondaryIntent: routerResult.intent.secondaryIntent,
          confidence: routerResult.intent.confidence,
          topic: routerResult.intent.topic,
          subtopic: routerResult.intent.subtopic,
          clarificationRequired: routerResult.intent.needsClarification,
          model: routerResult.model,
        },
      });
    } else {
      await logEvent(supabase, {
        traceId,
        eventName: "routing_failed",
        studentId,
        conversationId: activeConversationId,
        payload: { reason: routerResult.reason },
      });
    }

    if (routerResult.success && routerResult.intent.needsClarification) {
      replyContent = routerResult.intent.clarificationQuestion!;
      llmMetadata = { isClarification: true };
    } else {
      const llmStartedAt = Date.now();
      const llmResult = await generateTeachingReply(history);
      const llmLatencyMs = Date.now() - llmStartedAt;

      // Logged immediately, separate from the reply_sent/reply_failed events
      // below -- this is observability into the new external dependency
      // itself (did Claude answer, how long did it take), not into whether
      // the resulting text made it into the database.
      await logEvent(supabase, {
        traceId,
        eventName: llmResult.success ? "llm_call_succeeded" : "llm_call_failed",
        studentId,
        conversationId: activeConversationId,
        payload: llmResult.success
          ? {
              model: llmResult.model,
              inputTokens: llmResult.inputTokens,
              outputTokens: llmResult.outputTokens,
              latencyMs: llmLatencyMs,
            }
          : { reason: llmResult.reason, latencyMs: llmLatencyMs },
      });

      if (llmResult.success) {
        replyContent = llmResult.content;
      } else {
        // Honest, saved fallback -- mirrors the same principle M0-06 already
        // applies to the placeholder reply and M0-08 applies to safety
        // declines: even a bad outcome gets a real, persisted turn in the
        // conversation, never a raw crash or a silently missing reply.
        replyContent = buildLLMFailureReply();
        llmMetadata = { isFallbackReply: true };
      }
    }
  }

  const { data: assistantMessage, error: assistantMessageError } =
    await supabase
      .from("messages")
      .insert({
        conversation_id: activeConversationId,
        role: "assistant",
        content: replyContent,
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
    eventName: safetyCheck.safe ? "reply_sent" : "safety_reply_sent",
    studentId,
    conversationId: activeConversationId,
    payload: {
      userMessageId: userMessage.id,
      assistantMessageId: assistantMessage.id,
      ...llmMetadata,
    },
  });

  return Response.json({
    conversationId: activeConversationId,
    userMessage,
    assistantMessage,
    traceId,
  });
}

// Shown when the Claude API call itself fails (rate limit, timeout,
// outage) -- an honest, persisted turn rather than a raw crash or a
// silently missing reply. See Task 5 notes in
// docs/implementation/M1-04-Chat-Route-Integration.md.
function buildLLMFailureReply(): string {
  return "I'm having trouble responding right now. Please try sending your message again in a moment.";
}
