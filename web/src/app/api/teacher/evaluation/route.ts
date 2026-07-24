import { getEvaluationAnalytics } from "@/lib/evaluation-analytics/get-evaluation-analytics";
import { resolveRange } from "@/lib/progress-analytics/progress-analytics-aggregation";
import { requireTeacher } from "@/lib/teacher-roster/require-teacher";
import type { EvaluationSourceAgent } from "@/lib/agents/evaluation-agent";

const VALID_SOURCE_AGENTS: EvaluationSourceAgent[] = ["Concept", "Practice", "Assessment"];

/**
 * `/studio/evaluation` (Epic I1) -- teacher-scoped Evaluation Dashboard,
 * per the approved scope-down (no admin role/cross-student RLS exists
 * in this schema). `GET /api/teacher/evaluation?classId&range&sourceAgent`.
 */
export async function GET(request: Request) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const classId = url.searchParams.get("classId");
  if (!classId) {
    return Response.json({ error: "A classId is required." }, { status: 400 });
  }
  const range = resolveRange(url.searchParams.get("range"));
  const sourceAgentParam = url.searchParams.get("sourceAgent");
  const sourceAgent = (VALID_SOURCE_AGENTS as string[]).includes(sourceAgentParam ?? "") ? (sourceAgentParam as EvaluationSourceAgent) : null;

  const result = await getEvaluationAnalytics(auth.supabase, auth.teacherId, classId, range, sourceAgent);

  if (result.status === "error") {
    return Response.json({ error: "Couldn't load that class's evaluation data." }, { status: 500 });
  }
  if (result.status === "forbidden") {
    return Response.json({ error: "That's not one of your classes." }, { status: 403 });
  }
  return Response.json(result.data);
}
