import { createClient } from "@/lib/supabase/server";
import { listPendingRequestsForStudent } from "@/lib/parent-links/list-pending-requests";

/**
 * `GET /api/student/parent-requests` (Parent Verification & Consent, v1).
 * Same auth convention as every other student route in this codebase
 * (signed-in check only, no separate role gate -- /app's layout already
 * restricts this surface, and RLS scopes every query to the caller's
 * own id regardless).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const studentId = claimsData.claims.sub as string;
  const requests = await listPendingRequestsForStudent(supabase, studentId);
  return Response.json({ requests });
}
