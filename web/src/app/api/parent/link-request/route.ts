import { createLinkRequest } from "@/lib/parent/create-link-request";
import { requireParent } from "@/lib/parent/require-parent";

/**
 * `POST /api/parent/link-request` (Epic H2) -- docs/ui-architecture/
 * 10_API_Contracts.md. Body uses `studentId` (the student's exact
 * account id), matching this codebase's established naming (the same
 * choice Teacher Studio's roster-enrollment endpoint made) rather than
 * the doc's placeholder `studentIdentifier` -- no other identifier
 * exists (`profiles` has no email/username column).
 */
export async function POST(request: Request) {
  const auth = await requireParent();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const studentId = typeof body?.studentId === "string" ? body.studentId : "";
  if (!studentId) {
    return Response.json({ error: "A studentId is required." }, { status: 400 });
  }

  const result = await createLinkRequest(auth.supabase, auth.parentId, studentId);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json({ status: "pending" });
}
