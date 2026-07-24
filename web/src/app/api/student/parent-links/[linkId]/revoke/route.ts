import { createClient } from "@/lib/supabase/server";
import { revokeLink } from "@/lib/parent-links/link-actions";

/** `POST /api/student/parent-links/:linkId/revoke` -- a student ending a verified parent's access. */
export async function POST(_request: Request, { params }: { params: Promise<{ linkId: string }> }) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const { linkId } = await params;
  const result = await revokeLink(supabase, linkId);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json({ status: "revoked" });
}
