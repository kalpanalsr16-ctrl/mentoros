import { generateHomework } from "@/lib/teacher-homework/generate-homework";
import { requireTeacher } from "@/lib/teacher-roster/require-teacher";
import type { PracticeDifficulty } from "@/lib/agents/practice-agent";

const VALID_DIFFICULTIES: PracticeDifficulty[] = ["Beginner", "Easy", "Medium", "Advanced", "Challenge"];

function isPracticeDifficulty(value: string): value is PracticeDifficulty {
  return (VALID_DIFFICULTIES as string[]).includes(value);
}

/**
 * `POST /api/teacher/homework` (Epic G13) -- docs/ui-architecture/
 * 10_API_Contracts.md: `{ studentId? classId?, concept, difficulty }` ->
 * `PracticeSet` shape. `concept` is passed as `conceptId`, matching this
 * codebase's established naming (practice-history/roadmap/assessment-
 * history all use conceptId/conceptName, not a bare "concept" field).
 */
export async function POST(request: Request) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const conceptId = typeof body?.conceptId === "string" ? body.conceptId : "";
  const difficultyInput = typeof body?.difficulty === "string" ? body.difficulty : "";
  const studentId = typeof body?.studentId === "string" ? body.studentId : undefined;
  const classId = typeof body?.classId === "string" ? body.classId : undefined;

  if (!conceptId) {
    return Response.json({ error: "A conceptId is required." }, { status: 400 });
  }
  if (!isPracticeDifficulty(difficultyInput)) {
    return Response.json({ error: `difficulty must be one of: ${VALID_DIFFICULTIES.join(", ")}.` }, { status: 400 });
  }
  const difficulty = difficultyInput;
  if (!studentId && !classId) {
    return Response.json({ error: "Provide either a studentId or a classId." }, { status: 400 });
  }
  if (studentId && classId) {
    return Response.json({ error: "Provide only one of studentId or classId, not both." }, { status: 400 });
  }

  const result = await generateHomework(auth.supabase, auth.teacherId, { conceptId, difficulty, studentId, classId });

  if (result.status === "forbidden") {
    return Response.json({ error: "That student or class isn't yours." }, { status: 403 });
  }
  if (result.status === "concept_not_found") {
    return Response.json({ error: "Concept not found." }, { status: 404 });
  }
  if (result.status === "generation_failed") {
    return Response.json({ error: `Couldn't generate homework right now (${result.reason}).` }, { status: 502 });
  }
  return Response.json(result.data);
}
