import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { ChatShell } from "@/components/chat/ChatShell";
import type { ChatMessage } from "@/components/chat/MessageList";

export default async function ChatPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  // The proxy already redirects signed-out requests away from /chat.
  // This is a defensive second check, in case the proxy's matcher ever
  // stops covering this route.
  if (!data?.claims) {
    redirect("/sign-in");
  }

  const email = data.claims.email as string | undefined;

  // Load the student's most recent conversation (if any) so a page
  // reload shows persisted history instead of starting from empty.
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id")
    .order("started_at", { ascending: false })
    .limit(1);

  const conversationId = conversations?.[0]?.id ?? null;

  let initialMessages: ChatMessage[] = [];
  if (conversationId) {
    const { data: messageRows } = await supabase
      .from("messages")
      .select("id, role, content, trace_id")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    initialMessages = messageRows ?? [];
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.75rem 1rem",
          borderBottom: "1px solid #ddd",
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 600 }}>MentorOS</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {email && (
            <span style={{ fontSize: "0.875rem", opacity: 0.7 }}>{email}</span>
          )}
          <SignOutButton />
        </div>
      </header>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ChatShell
          initialConversationId={conversationId}
          initialMessages={initialMessages}
        />
      </div>
    </div>
  );
}
