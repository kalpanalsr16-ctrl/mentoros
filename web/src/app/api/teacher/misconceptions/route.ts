import { getMisconceptionReport } from "@/lib/misconceptions/get-misconception-report";
import { requireTeacher } from "@/lib/teacher-roster/require-teacher";

/**
 * `/studio/misconceptions` (Epic G10) -- docs/ui-architecture/
 * 10_API_Contracts.md's `GET /api/teacher/misconceptions?classId`.
 */
export async function GET(request: Request) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;

  const classId = new URL(request.url).searchParams.get("classId");
  if (!classId) {
    return Response.json({ error: "A classId is required." }, { status: 400 });
  }

  const result = await getMisconceptionReport(auth.supabase, auth.teacherId, classId);

  if (result.status === "error") {
    return Response.json({ error: "Couldn't load that class's misconception report." }, { status: 500 });
  }
  if (result.status === "forbidden") {
    return Response.json({ error: "That's not one of your classes." }, { status: 403 });
  }
  return Response.json(result.data);
}
