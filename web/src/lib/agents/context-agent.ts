import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type ClaudeMessage = {
  role: "user" | "assistant";
  content: string;
};

/**
 * Bounds how much history is sent to the model on every turn. M1 does not
 * summarize long conversations -- that's deferred until conversations are
 * regularly long enough to need it (see 08_Roadmap.md, M1 scope notes). A
 * fixed recency window is the pragmatic stand-in for now: it reduces
 * token cost/latency the same way a real summary eventually will, without
 * the added complexity of a second LLM call to produce that summary.
 */
const MAX_HISTORY_MESSAGES = 20;

/**
 * Assembles a conversation's recent message history into the shape
 * Anthropic's Messages API requires: chronological order, "system" role
 * rows excluded (Claude's system prompt is a separate top-level field,
 * not part of the message list), and starting on a "user" turn (the API
 * rejects a list that opens with "assistant").
 *
 * Called after the current turn's user message has already been saved
 * (see the M0-06 save-then-reply flow in /api/chat), so the returned
 * history naturally ends with the message the student just sent --
 * no separate "append the current message" step is needed.
 */
export async function buildConversationContext(
  supabase: SupabaseServerClient,
  conversationId: string,
): Promise<ClaudeMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY_MESSAGES);

  if (error || !data) {
    return [];
  }

  const chronological = data.reverse();

  // A recency-capped window can cut a conversation mid-pair, leaving the
  // window starting on an "assistant" turn -- invalid for the API, which
  // requires the message list to open with "user". Drop leading
  // assistant messages until it does.
  while (chronological.length > 0 && chronological[0].role !== "user") {
    chronological.shift();
  }

  return chronological.map((message) => ({
    role: message.role as "user" | "assistant",
    content: message.content,
  }));
}
