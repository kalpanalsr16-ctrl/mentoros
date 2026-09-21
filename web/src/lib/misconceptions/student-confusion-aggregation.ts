/**
 * Repeated Confusion (learner UI redesign) -- a per-student, cross-turn
 * re-key of aggregateMisconceptions (misconception-report-aggregation.ts),
 * which does the same exact-text grouping across a teacher's whole
 * roster. Deliberately exact-string matching only, same as that file --
 * misconceptions are LLM-generated free text (assessment-agent.ts's
 * prompt asks for "misconception names/descriptions", not a selection
 * from a fixed id list), so two turns describing the same real confusion
 * in different words will NOT be linked here. That's an honest
 * limitation, not a bug: this surfaces "flagged more than once with the
 * same wording," not "AI detected a recurring pattern" -- a claim this
 * data can't actually support without semantic matching, which the
 * product brief explicitly rules out as unreliable for this use.
 */

export type ConfusionEventRow = {
  misconceptions: string[];
  conceptName: string | null;
  createdAt: string;
};

export type ConfusionItem = {
  text: string;
  frequency: number;
  conceptNames: string[];
  firstSeenAt: string;
  lastSeenAt: string;
};

export function aggregateStudentConfusion(rows: ConfusionEventRow[], minFrequency = 2): ConfusionItem[] {
  const byText = new Map<string, { frequency: number; conceptNames: Set<string>; firstSeenAt: string; lastSeenAt: string }>();

  for (const row of rows) {
    for (const text of row.misconceptions) {
      if (!text) continue;
      const entry = byText.get(text) ?? {
        frequency: 0,
        conceptNames: new Set<string>(),
        firstSeenAt: row.createdAt,
        lastSeenAt: row.createdAt,
      };
      entry.frequency += 1;
      if (row.conceptName) entry.conceptNames.add(row.conceptName);
      if (row.createdAt < entry.firstSeenAt) entry.firstSeenAt = row.createdAt;
      if (row.createdAt > entry.lastSeenAt) entry.lastSeenAt = row.createdAt;
      byText.set(text, entry);
    }
  }

  return [...byText.entries()]
    .map(([text, entry]) => ({
      text,
      frequency: entry.frequency,
      conceptNames: [...entry.conceptNames],
      firstSeenAt: entry.firstSeenAt,
      lastSeenAt: entry.lastSeenAt,
    }))
    .filter((item) => item.frequency >= minFrequency)
    .sort((a, b) => b.frequency - a.frequency);
}
