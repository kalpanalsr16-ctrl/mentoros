/**
 * Topics a student actually asked about, taken from the router's own per-question
 * topic labels. Covers subjects outside the curriculum, which the concept-mastery
 * model cannot represent. Pure; I/O lives in get-learner-topics.ts.
 */

export type TopicRow = {
  traceId: string;
  topic: string | null;
  subtopic: string | null;
  askedAt: string;
  /** "tutor_auto" for the AI Tutor's automatic lesson request; excluded from topics. */
  source: string | null;
  question: string | null;
};

export type LearnerTopic = {
  label: string;
  askCount: number;
  lastAskedAt: string;
  recentQuestions: string[];
  subtopics: string[];
};

export type TopicSuggestion = { label: string; reason: string };

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RECENT_QUESTIONS = 3;
const MAX_SUBTOPICS = 3;
const MAX_SUGGESTIONS = 3;
const MIN_DAYS_FOR_PICKUP = 3;

const NOT_A_TOPIC = /language|style|preference|setting|greeting|^-+$|^(none|unknown|general)$/i;
const ALIASES: Array<[RegExp, string]> = [
  [/trig/i, "Trigonometry"],
  [/addition/i, "Addition"],
  [/subtraction/i, "Subtraction"],
  [/calculus/i, "Calculus"],
  [/\bpi\b/i, "Pi"],
  [/\barea\b/i, "Area"],
];

export function normalizeTopicLabel(raw: string | null): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed || NOT_A_TOPIC.test(trimmed)) return null;
  for (const [pattern, label] of ALIASES) {
    if (pattern.test(trimmed)) return label;
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function buildLearnerTopics(rows: TopicRow[]): LearnerTopic[] {
  type Group = {
    traces: Set<string>;
    lastAskedAt: string;
    questions: Array<{ at: string; text: string }>;
    subtopics: Map<string, { name: string; count: number }>;
  };
  const groups = new Map<string, Group>();

  for (const row of rows) {
    if (row.source === "tutor_auto") continue;
    const label = normalizeTopicLabel(row.topic);
    if (!label) continue;

    const group: Group = groups.get(label) ?? {
      traces: new Set<string>(),
      lastAskedAt: row.askedAt,
      questions: [],
      subtopics: new Map<string, { name: string; count: number }>(),
    };
    group.traces.add(row.traceId);
    if (row.askedAt > group.lastAskedAt) group.lastAskedAt = row.askedAt;
    if (row.question) group.questions.push({ at: row.askedAt, text: row.question.trim().slice(0, 140) });

    const subtopic = row.subtopic?.trim();
    if (subtopic && !NOT_A_TOPIC.test(subtopic)) {
      const key = subtopic.toLowerCase();
      const current = group.subtopics.get(key);
      group.subtopics.set(key, { name: current?.name ?? subtopic, count: (current?.count ?? 0) + 1 });
    }
    groups.set(label, group);
  }

  return [...groups.entries()]
    .map(([label, group]) => ({
      label,
      askCount: group.traces.size,
      lastAskedAt: group.lastAskedAt,
      recentQuestions: uniqueNewestFirst(group.questions).slice(0, MAX_RECENT_QUESTIONS),
      subtopics: [...group.subtopics.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, MAX_SUBTOPICS)
        .map(({ name }) => name),
    }))
    .sort((a, b) => b.askCount - a.askCount || (a.lastAskedAt < b.lastAskedAt ? 1 : -1));
}

/** Topics the student asked about several times but not recently, the natural next step to pick back up. */
export function suggestTopics(topics: LearnerTopic[], now: Date): TopicSuggestion[] {
  return topics
    .map((topic) => ({ topic, days: Math.floor((now.getTime() - new Date(topic.lastAskedAt).getTime()) / DAY_MS) }))
    .filter(({ days }) => days >= MIN_DAYS_FOR_PICKUP)
    .sort((a, b) => b.topic.askCount - a.topic.askCount || a.days - b.days)
    .slice(0, MAX_SUGGESTIONS)
    .map(({ topic, days }) => ({
      label: topic.label,
      reason: `Asked ${topic.askCount} ${topic.askCount === 1 ? "time" : "times"}, last ${days} ${days === 1 ? "day" : "days"} ago`,
    }));
}

function uniqueNewestFirst(items: Array<{ at: string; text: string }>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of [...items].sort((a, b) => (a.at < b.at ? 1 : -1))) {
    const key = item.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item.text);
  }
  return out;
}
