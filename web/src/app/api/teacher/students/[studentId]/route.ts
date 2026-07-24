import { getStudentOverview } from "@/lib/teacher-roster/get-student-overview";
import { requireTeacher } from "@/lib/teacher-roster/require-teacher";

/**
 * `/studio/students/:studentId` (Epic G4) -- docs/ui-architecture/
 * 10_API_Contracts.md's `GET /api/teacher/students/:studentId`: "requires
 * a class_students relationship; 403 otherwise" -- this is the sprint's
 * stated primary acceptance criterion.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;

  const { studentId } = await params;
  const result = await getStudentOverview(auth.supabase, auth.teacherId, studentId);

  if (result.status === "error") {
    return Response.json({ error: "Couldn't load that student." }, { status: 500 });
  }
  if (result.status === "forbidden") {
    return Response.json({ error: "That student isn't in one of your classes." }, { status: 403 });
  }
  return Response.json(result.data);
}
