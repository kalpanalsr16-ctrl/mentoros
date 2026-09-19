import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { ChatShell } from "@/components/chat/ChatShell";
import type { ChatMessage } from "@/components/chat/MessageList";
import styles from "./page.module.css";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  // The proxy already redirects signed-out requests away from /chat.
  // This is a defensive second check, in case the proxy's matcher ever
  // stops covering this route.
  if (!data?.claims) {
    redirect("/sign-in");
  }

  const studentId = data.claims.sub as string;
  const email = data.claims.email as string | undefined;

  // Welcome experience (Sprint 4): a student with no learner_profiles row
  // has never been through onboarding (or explicitly skipped it -- Skip
  // still writes a minimal row, see /onboarding, so this only ever fires
  // once per real first-time visit, not on every reload). Deliberately a
  // top-level route, not web/src/app/app/onboarding as first sketched in
  // 13_Implementation_Sequence.md's Epic F1 -- /app/layout.tsx wraps
  // everything under /app in the full MinimalShell (sidebar, nav chrome),
  // which is exactly the "minimal chrome" onboarding's own spec (doc
  // 04-UX-Design-Experiences.md §11.1) argues against for this flow.
  const { data: existingProfile } = await supabase
    .from("learner_profiles")
    .select("id")
    .eq("id", studentId)
    .maybeSingle();

  if (!existingProfile) {
    redirect("/onboarding");
  }

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
    // superseded_at is null -- a Retry (Sprint 4) marks the attempt it
    // replaces superseded rather than deleting or overwriting it (trace/
    // evaluation integrity), so the default conversation view excludes
    // those rows here rather than at write time.
    const { data: messageRows } = await supabase
      .from("messages")
      .select("id, role, content, trace_id")
      .eq("conversation_id", conversationId)
      .is("superseded_at", null)
      .order("created_at", { ascending: true });

    initialMessages = messageRows ?? [];
  }

  // Explicit onboarding action (Sprint 4): "Start Diagnostic" navigates
  // here with ?autosend=diagnostic rather than relying on the student to
  // notice and send a pre-filled message themselves -- ChatShell sends it
  // once on mount, through the same unmodified pipeline any typed message
  // goes through. Epic F6's "Revise now" reuses the same mechanism with
  // ?autosend=revise&concept=<name> rather than inventing a second one.
  const resolvedSearchParams = await searchParams;
  const conceptParam = resolvedSearchParams.concept;
  const conceptName = typeof conceptParam === "string" ? conceptParam : undefined;

  let autoSendMessage: string | undefined;
  if (resolvedSearchParams.autosend === "diagnostic") {
    autoSendMessage = "I'd like to start with a quick diagnostic to see where I'm starting.";
  } else if (resolvedSearchParams.autosend === "revise" && conceptName) {
    autoSendMessage = `Can you help me revisit ${conceptName}?`;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.wordmark}>MentorOS</p>
        <div className={styles.headerRight}>
          <Link href="/eval" className={styles.evalLink}>
            View Evaluation Results
          </Link>
          {email && <span className={styles.email}>{email}</span>}
          <SignOutButton />
        </div>
      </header>
      <div className={styles.body}>
        <ChatShell
          initialConversationId={conversationId}
          initialMessages={initialMessages}
          autoSendMessage={autoSendMessage}
        />
      </div>
    </div>
  );
}
