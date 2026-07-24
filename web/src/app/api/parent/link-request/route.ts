import { createLinkRequest } from "@/lib/parent/create-link-request";
import { requireParent } from "@/lib/parent/require-parent";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `POST /api/parent/link-request` (Epic H2, rewritten for the approved
 * Parent Verification & Consent design) -- docs/ui-architecture/
 * 10_API_Contracts.md. Body uses `studentId` (the student's exact
 * account id), matching this codebase's established naming rather than
 * the doc's placeholder `studentIdentifier` -- no other identifier
 * exists (`profiles` has no email/username column).
 *
 * UUID-format validation happens here (a real input-shape boundary
 * check, not an enumeration signal -- rejecting a non-UUID string
 * reveals nothing about whether any real-looking id exists). Every
 * other outcome collapses into the same 200 response, per the
 * anti-enumeration requirement -- see create-link-request.ts.
 */
export async function POST(request: Request) {
  const auth = await requireParent();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const studentId = typeof body?.studentId === "string" ? body.studentId : "";
  if (!UUID_PATTERN.test(studentId)) {
    return Response.json({ error: "A valid studentId is required." }, { status: 400 });
  }

  const result = await createLinkRequest(auth.supabase, studentId);
  if (result.status === "rate_limited") {
    return Response.json({ error: "Too many link requests. Please try again later." }, { status: 429 });
  }
  return Response.json({ status: "pending" });
}
