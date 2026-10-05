import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/dashboard/get-dashboard-data";
import { AskMentorView } from "@/components/chat/AskMentorView";
import { checkShowcaseAccess } from "@/lib/showcase/showcase-access";
import type { ChatMessage } from "@/components/chat/MessageList";

const HISTORY_MESSAGE_LIMIT = 200;

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

  // Welcome experience (Sprint 4): a student with no learner_profiles row
  // has never been through onboarding (or explicitly skipped it -- Skip
  // still writes a minimal row, see /onboarding, so this only ever fires
  // once per real first-time visit, not on every reload). Deliberately a
  // top-level route, not web/src/app/app/onboarding as first sketched in
  // 13_Implementation_Sequence.md's Epic F1 -- onboarding's own spec (doc
  // 04-UX-Design-Experiences.md §11.1) argues for minimal chrome, which
  // the persistent LearnerShell nav (learner UI redesign) intentionally
  // doesn't give it.
  const { data: existingProfile } = await supabase
    .from("learner_profiles")
    .select("id")
    .eq("id", studentId)
    .maybeSingle();

  if (!existingProfile) {
    redirect("/onboarding");
  }

  // History spans every conversation, not just the newest one: AI Tutor and
  // Ask Mentor each start conversations, and voice turns land in their own,
  // so loading only the latest conversation hid real history. New messages
  // continue in the conversation of the most recent message.
  const { data: recentRows } = await supabase
    .from("messages")
    .select("id, role, content, trace_id, conversation_id")
    .is("superseded_at", null)
    .order("created_at", { ascending: false })
    .limit(HISTORY_MESSAGE_LIMIT);

  // AI Tutor's automatic lesson request isn't something the student asked here.
  // Its turns are recognised two ways: the tagged reply event (newer turns), or the
  // exact prompt the tutor sends for a concept (turns stored before the tag existed).
  const { data: tutorAutoReplies } = await supabase
    .from("events")
    .select("payload")
    .eq("event_name", "reply_sent")
    .eq("payload->>source", "tutor_auto")
    .order("created_at", { ascending: false })
    .limit(1000);
  const tutorAutoMessageIds = new Set(
    (tutorAutoReplies ?? []).flatMap((row) => {
      const payload = row.payload as { userMessageId?: string; assistantMessageId?: string };
      return [payload.userMessageId, payload.assistantMessageId].filter((id): id is string => Boolean(id));
    }),
  );
  const { data: conceptRows } = await supabase.from("concepts").select("name");
  const tutorPrompts = new Set((conceptRows ?? []).map((c) => `Can you explain ${c.name}?`));

  // A reply belongs to the question right before it, so it inherits that question's status.
  const visibleRows: typeof recentRows = [];
  let inTutorExchange = false;
  for (const row of [...(recentRows ?? [])].reverse()) {
    if (row.role === "user") inTutorExchange = tutorPrompts.has(row.content) || tutorAutoMessageIds.has(row.id);
    const isTutorReply = row.role === "assistant" && (inTutorExchange || tutorAutoMessageIds.has(row.id));
    if (!isTutorReply && !(row.role === "user" && inTutorExchange)) visibleRows.push(row);
  }

  const orderedRows = visibleRows ?? [];
  const conversationId = orderedRows.at(-1)?.conversation_id ?? null;
  const initialMessages: ChatMessage[] = orderedRows.map(({ id, role, content, trace_id }) => ({
    id,
    role,
    content,
    trace_id,
  }));

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

  // Welcome state's "Continue learning" + streak (learner UI redesign) --
  // the exact same real aggregation the old /app Dashboard used
  // (getDashboardData), not a new query. Most-recently-practiced concept,
  // not the weakest one -- "continue where you left off" is a recency
  // read, not a revision nudge (that's the Revision Queue's job).
  const dashboardData = await getDashboardData(supabase, studentId);
  const continueLearning = dashboardData?.recentConcepts[0]
    ? {
        conceptId: dashboardData.recentConcepts[0].conceptId,
        conceptName: dashboardData.recentConcepts[0].conceptName,
        masteryScore: dashboardData.recentConcepts[0].masteryScore,
      }
    : null;

  const canInspectTraces = (await checkShowcaseAccess(supabase)) === "authorized";

  return (
    <AskMentorView
      initialConversationId={conversationId}
      initialMessages={initialMessages}
      autoSendMessage={autoSendMessage}
      continueLearning={continueLearning}
      streak={dashboardData?.streak ?? 0}
      canInspectTraces={canInspectTraces}
    />
  );
}
