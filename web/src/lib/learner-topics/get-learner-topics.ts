import type { createClient } from "@/lib/supabase/server";
import {
  buildLearnerTopics,
  suggestTopics,
  type LearnerTopic,
  type TopicRow,
  type TopicSuggestion,
} from "@/lib/learner-topics/learner-topics-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const EVENT_LIMIT = 1000;
const QUESTION_LIMIT = 300;

/**
 * Reads this student's own intent_detected (topic) and reply_sent (source,
 * question link) events, plus the question text. Both are existing events, so
 * no new storage is needed. Returns null only on a real query failure.
 */
export async function getLearnerTopics(
  supabase: SupabaseServerClient,
  studentId: string,
  now: Date,
): Promise<{ topics: LearnerTopic[]; suggestions: TopicSuggestion[] } | null> {
  const [intents, replies] = await Promise.all([
    supabase
      .from("events")
      .select("trace_id, payload, created_at")
      .eq("student_id", studentId)
      .eq("event_name", "intent_detected")
      .order("created_at", { ascending: false })
      .limit(EVENT_LIMIT),
    supabase
      .from("events")
      .select("trace_id, payload")
      .eq("student_id", studentId)
      .eq("event_name", "reply_sent")
      .order("created_at", { ascending: false })
      .limit(EVENT_LIMIT),
  ]);

  if (intents.error || replies.error) return null;

  const replyByTrace = new Map<string, { source: string | null; userMessageId: string | null }>();
  for (const row of replies.data ?? []) {
    const payload = row.payload as { source?: string; userMessageId?: string };
    replyByTrace.set(row.trace_id, {
      source: payload.source ?? null,
      userMessageId: payload.userMessageId ?? null,
    });
  }

  const linked = (intents.data ?? []).slice(0, QUESTION_LIMIT).map((row) => ({
    row,
    reply: replyByTrace.get(row.trace_id) ?? null,
  }));
  const messageIds = linked.map((item) => item.reply?.userMessageId).filter((id): id is string => Boolean(id));

  const questionById = new Map<string, string>();
  if (messageIds.length > 0) {
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("id, content")
      .in("id", messageIds);
    if (messagesError) return null;
    for (const message of messages ?? []) questionById.set(message.id, message.content);
  }

  const rows: TopicRow[] = linked.map(({ row, reply }) => {
    const payload = row.payload as { topic?: string | null; subtopic?: string | null };
    return {
      traceId: row.trace_id,
      topic: payload.topic ?? null,
      subtopic: payload.subtopic ?? null,
      askedAt: row.created_at,
      source: reply?.source ?? null,
      question: reply?.userMessageId ? (questionById.get(reply.userMessageId) ?? null) : null,
    };
  });

  const topics = buildLearnerTopics(rows);
  return { topics, suggestions: suggestTopics(topics, now) };
}
