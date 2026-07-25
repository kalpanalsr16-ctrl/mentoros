import { createClient } from "@/lib/supabase/server";
import { getLatestAssistantConversation } from "@/lib/teacher-assistant/manage-assistant-conversation";
import { AssistantChat } from "./AssistantChat";
import styles from "./page.module.css";

/**
 * `/studio/assistant` (Epic G14) -- docs/ui-architecture/
 * 03_Teacher_Studio.md's AI Lesson Assistant: conversational authoring
 * help, entirely separate data domain from student /chat.
 */
export default async function AssistantPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const teacherId = claimsData!.claims!.sub as string;

  const result = await getLatestAssistantConversation(supabase, teacherId);

  if (result.status === "error") {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Lesson Assistant</h1>
        <p className={styles.body}>Couldn&apos;t load your conversation right now. Please try again.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Lesson Assistant</h1>
      <p className={styles.body}>Brainstorm lesson ideas, get concept explanations, or draft assessment questions.</p>
      <AssistantChat initialConversationId={result.conversationId} initialMessages={result.messages} />
    </div>
  );
}
