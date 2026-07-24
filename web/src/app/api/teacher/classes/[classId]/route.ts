import { getClassOverview } from "@/lib/teacher-roster/get-class-overview";
import { requireTeacher } from "@/lib/teacher-roster/require-teacher";

/**
 * `/studio/classes/:classId` (Epic G3) -- docs/ui-architecture/
 * 10_API_Contracts.md's `GET /api/teacher/classes/:classId`.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ classId: string }> }) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;

  const { classId } = await params;
  const result = await getClassOverview(auth.supabase, auth.teacherId, classId);

  if (result.status === "error") {
    return Response.json({ error: "Couldn't load that class." }, { status: 500 });
  }
  if (result.status === "forbidden") {
    return Response.json({ error: "That's not one of your classes." }, { status: 403 });
  }
  return Response.json(result.data);
}
