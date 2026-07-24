import { getAssessment } from "@/lib/teacher-assessments/get-assessment";
import { updateAssessment } from "@/lib/teacher-assessments/update-assessment";
import { deleteAssessment } from "@/lib/teacher-assessments/delete-assessment";
import { requireTeacher } from "@/lib/teacher-roster/require-teacher";

/**
 * `/studio/assessments/:assessmentId` -- not itself spelled out in
 * 10_API_Contracts.md (only the list/create shape is), but implied by
 * 03_Teacher_Studio.md's own route list. Mirrors the `{ lesson }`-style
 * detail-endpoint precedent noted for Lesson Planner: single-object
 * response, partial-body PATCH.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ assessmentId: string }> }) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;

  const { assessmentId } = await params;
  const assessment = await getAssessment(auth.supabase, auth.teacherId, assessmentId);

  if (!assessment) {
    return Response.json({ error: "That's not one of your assessments." }, { status: 404 });
  }
  return Response.json({ assessment });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ assessmentId: string }> }) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;

  const { assessmentId } = await params;
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const questions = Array.isArray(body?.questions) ? body.questions : [];

  const result = await updateAssessment(auth.supabase, auth.teacherId, assessmentId, { title, questions });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ assessmentId: string }> }) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;

  const { assessmentId } = await params;
  const result = await deleteAssessment(auth.supabase, auth.teacherId, assessmentId);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json({ success: true });
}
