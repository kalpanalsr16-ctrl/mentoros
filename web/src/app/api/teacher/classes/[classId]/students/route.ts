import { addStudentToClass } from "@/lib/teacher-roster/manage-roster";
import { requireTeacher } from "@/lib/teacher-roster/require-teacher";

/**
 * Teacher-managed roster mutation for Epic G3 -- not itself named in
 * 10_API_Contracts.md (that doc only specifies the read shapes), but a
 * necessary, additive extension: the doc's proposed RLS already grants a
 * teacher insert/delete on their own class's `class_students`
 * (0011_classes.sql); this route is the thin, auth-checked wrapper that
 * exercises it. No self-enrollment/join-code path exists here or
 * anywhere else -- adding a student is teacher-initiated only, by the
 * student's exact account id (see manage-roster.ts).
 */
export async function POST(request: Request, { params }: { params: Promise<{ classId: string }> }) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;

  const { classId } = await params;

  // `classes`' own SELECT policy already only returns a teacher's own
  // rows, so a nonexistent id and someone else's class look identical
  // here -- both collapse to the same 403, same reasoning as
  // get-class-overview.ts's ownership check.
  const { data: classRow } = await auth.supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("teacher_id", auth.teacherId)
    .maybeSingle();
  if (!classRow) {
    return Response.json({ error: "That's not one of your classes." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const studentId = typeof body?.studentId === "string" ? body.studentId : "";
  if (!studentId) {
    return Response.json({ error: "A studentId is required." }, { status: 400 });
  }

  const result = await addStudentToClass(auth.supabase, classId, studentId);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json({ success: true });
}
