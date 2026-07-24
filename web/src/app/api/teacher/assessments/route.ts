import { listAssessments } from "@/lib/teacher-assessments/list-assessments";
import { createAssessment } from "@/lib/teacher-assessments/create-assessment";
import { requireTeacher } from "@/lib/teacher-roster/require-teacher";

/**
 * `/studio/assessments` (Epic G9) -- docs/ui-architecture/
 * 10_API_Contracts.md's `GET/POST /api/teacher/assessments`.
 */
export async function GET() {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;

  const assessments = await listAssessments(auth.supabase, auth.teacherId);
  if (!assessments) {
    return Response.json({ error: "Couldn't load your assessments." }, { status: 500 });
  }
  return Response.json({ assessments });
}

export async function POST(request: Request) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const questions = Array.isArray(body?.questions) ? body.questions : [];

  const result = await createAssessment(auth.supabase, auth.teacherId, { title, questions });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json({ id: result.id });
}
