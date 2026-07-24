import type { createClient } from "@/lib/supabase/server";
import { generateTeacherAssistantReply, type TeacherAssistantMessage } from "./teacher-assistant-agent";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type AssistantTurnResult =
  | { status: "ok"; conversationId: string; userMessage: TeacherAssistantMessage; assistantMessage: TeacherAssistantMessage }
  | { status: "forbidden" }
  | { status: "error" };

/**
 * Server-side initial load for `/studio/assistant` -- single ongoing
 * conversation per teacher (no conversation-list UI in this pass), so
 * this is simply "the most recent one, if any."
 */
export async function getLatestAssistantConversation(
  supabase: SupabaseServerClient,
  teacherId: string,
): Promise<{ conversationId: string | null; messages: TeacherAssistantMessage[] }> {
  const { data: conversation } = await supabase
    .from("teacher_conversations")
    .select("id")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conversation) {
    return { conversationId: null, messages: [] };
  }

  const { data: messageRows } = await supabase
    .from("teacher_messages")
    .select("role, content")
    .eq("teacher_conversation_id", conversation.id)
    .order("created_at", { ascending: true });

  return {
    conversationId: conversation.id,
    messages: (messageRows ?? []).map((r) => ({ role: r.role as "user" | "assistant", content: r.content })),
  };
}

/**
 * One full turn: create a conversation if none given, save the teacher's
 * message, load history, call the agent, save the reply via the
 * SECURITY DEFINER RPC (0022_teacher_conversations.sql), return both
 * messages. Mirrors /api/chat's shape per 10_API_Contracts.md, without
 * that route's streaming/retry/cancel machinery -- out of scope for this
 * pass per the approved design.
 */
export async function runAssistantTurn(
  supabase: SupabaseServerClient,
  teacherId: string,
  conversationId: string | undefined,
  content: string,
): Promise<AssistantTurnResult> {
  let activeConversationId: string;

  if (!conversationId) {
    const { data: conversation, error: createError } = await supabase
      .from("teacher_conversations")
      .insert({ teacher_id: teacherId })
      .select("id")
      .single();
    if (createError || !conversation) return { status: "error" };
    activeConversationId = conversation.id;
  } else {
    activeConversationId = conversationId;
    // `teacher_conversations`' own SELECT policy already only returns a
    // teacher's own rows -- a nonexistent id and someone else's
    // conversation collapse to the same forbidden response, same
    // ownership-check pattern as every other teacher-owned resource
    // this session.
    const { data: existing } = await supabase
      .from("teacher_conversations")
      .select("id")
      .eq("id", activeConversationId)
      .eq("teacher_id", teacherId)
      .maybeSingle();
    if (!existing) return { status: "forbidden" };
  }

  const { data: userMessage, error: userMessageError } = await supabase
    .from("teacher_messages")
    .insert({ teacher_conversation_id: activeConversationId, role: "user", content })
    .select("role, content")
    .single();
  if (userMessageError || !userMessage) return { status: "error" };

  const { data: historyRows } = await supabase
    .from("teacher_messages")
    .select("role, content")
    .eq("teacher_conversation_id", activeConversationId)
    .order("created_at", { ascending: true });

  const history: TeacherAssistantMessage[] = (historyRows ?? []).map((r) => ({
    role: r.role as "user" | "assistant",
    content: r.content,
  }));

  const llmResult = await generateTeacherAssistantReply(history);
  const replyContent = llmResult.success
    ? llmResult.content
    : "I'm having trouble responding right now. Please try again in a moment.";

  const { data: assistantMessage, error: assistantMessageError } = await supabase
    .rpc("insert_teacher_assistant_message", {
      p_teacher_conversation_id: activeConversationId,
      p_content: replyContent,
    })
    .returns<{ role: string; content: string }[]>()
    .single();
  if (assistantMessageError || !assistantMessage) return { status: "error" };

  return {
    status: "ok",
    conversationId: activeConversationId,
    userMessage: { role: "user", content: userMessage.content },
    assistantMessage: { role: "assistant", content: assistantMessage.content },
  };
}
