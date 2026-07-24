import { runAssistantTurn } from "@/lib/teacher-assistant/manage-assistant-conversation";
import { requireTeacher } from "@/lib/teacher-roster/require-teacher";

/**
 * `/studio/assistant` (Epic G14) -- docs/ui-architecture/
 * 10_API_Contracts.md's `POST /api/teacher/assistant`: `{ conversationId?,
 * content }`, response mirrors `/api/chat`'s shape against the separate
 * teacher_conversations/teacher_messages domain.
 */
export async function POST(request: Request) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  const conversationId = typeof body?.conversationId === "string" ? body.conversationId : undefined;

  if (!content) {
    return Response.json({ error: "Message content is required." }, { status: 400 });
  }

  const result = await runAssistantTurn(auth.supabase, auth.teacherId, conversationId, content);

  if (result.status === "forbidden") {
    return Response.json({ error: "That's not one of your conversations." }, { status: 403 });
  }
  if (result.status === "error") {
    return Response.json({ error: "Couldn't send that message." }, { status: 500 });
  }

  return Response.json({
    conversationId: result.conversationId,
    userMessage: result.userMessage,
    assistantMessage: result.assistantMessage,
  });
}
