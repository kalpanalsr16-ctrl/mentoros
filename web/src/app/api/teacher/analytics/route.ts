import { getProgressAnalytics } from "@/lib/progress-analytics/get-progress-analytics";
import { resolveRange } from "@/lib/progress-analytics/progress-analytics-aggregation";
import { requireTeacher } from "@/lib/teacher-roster/require-teacher";

/**
 * `/studio/analytics` (Epic G11) -- docs/ui-architecture/
 * 10_API_Contracts.md's `GET /api/teacher/analytics?classId&range`.
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

  const result = await getProgressAnalytics(auth.supabase, auth.teacherId, classId, range);

  if (result.status === "error") {
    return Response.json({ error: "Couldn't load that class's analytics." }, { status: 500 });
  }
  if (result.status === "forbidden") {
    return Response.json({ error: "That's not one of your classes." }, { status: 403 });
  }
  return Response.json(result.data);
}
