import type { PracticeDifficulty } from "@/lib/agents/practice-agent";

export type PracticeEventRow = {
  id: string;
  created_at: string;
  payload: Record<string, unknown>;
};

export type PracticeHistoryItem = {
  id: string;
  conceptName: string;
  difficulty: PracticeDifficulty;
  questionCount: number;
  createdAt: string;
};

const VALID_DIFFICULTIES: PracticeDifficulty[] = ["Beginner", "Easy", "Medium", "Advanced", "Challenge"];

function isValidDifficulty(value: unknown): value is PracticeDifficulty {
  return typeof value === "string" && (VALID_DIFFICULTIES as string[]).includes(value);
}

/**
 * Maps raw `practice_generated` event rows (docs/ui-architecture/
 * 02_Student_Experience.md's Practice History) into the shape the page
 * renders. Pure and separately unit-testable from the Supabase query in
 * get-practice-history.ts, mirroring progress-aggregation.ts's split.
 * Rows already arrive reverse-chronological (query orders by created_at
 * desc) -- this function only reshapes payload fields, it doesn't re-sort.
 */
export function mapPracticeEvents(rows: PracticeEventRow[]): PracticeHistoryItem[] {
  return rows.map((row) => {
    const payload = row.payload;
    return {
      id: row.id,
      conceptName: typeof payload.conceptName === "string" ? payload.conceptName : "This concept",
      difficulty: isValidDifficulty(payload.difficulty) ? payload.difficulty : "Medium",
      questionCount: typeof payload.questionCount === "number" ? payload.questionCount : 0,
      createdAt: row.created_at,
    };
  });
}
