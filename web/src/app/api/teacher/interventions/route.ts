import { getInterventions } from "@/lib/interventions/get-interventions";
import { requireTeacher } from "@/lib/teacher-roster/require-teacher";

/**
 * `/studio/interventions` (Epic G12) -- docs/ui-architecture/
 * 10_API_Contracts.md's `GET /api/teacher/interventions?classId`.
 */
export async function GET(request: Request) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;

  const classId = new URL(request.url).searchParams.get("classId");
  if (!classId) {
    return Response.json({ error: "A classId is required." }, { status: 400 });
  }

  const result = await getInterventions(auth.supabase, auth.teacherId, classId);

  if (result.status === "error") {
    return Response.json({ error: "Couldn't load interventions for that class." }, { status: 500 });
  }
  if (result.status === "forbidden") {
    return Response.json({ error: "That's not one of your classes." }, { status: 403 });
  }
  return Response.json(result.data);
}
