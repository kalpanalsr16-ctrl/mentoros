import { getConceptDetail } from "@/lib/curriculum/get-concept-detail";
import { requireTeacher } from "@/lib/teacher-roster/require-teacher";

/** `GET /api/teacher/curriculum/:conceptId` (Epic G6 detail view). */
export async function GET(_request: Request, { params }: { params: Promise<{ conceptId: string }> }) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;

  const { conceptId } = await params;
  const result = await getConceptDetail(auth.supabase, conceptId);

  if (result.status === "not_found") {
    return Response.json({ error: "That concept doesn't exist." }, { status: 404 });
  }

  return Response.json(result.data);
}
