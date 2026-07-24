import { createClient } from "@/lib/supabase/server";
import { respondToLinkRequest } from "@/lib/parent-links/link-actions";

/** `POST /api/student/parent-requests/:linkId/reject` -- calls respond_to_link_request(linkId, 'rejected'). */
export async function POST(_request: Request, { params }: { params: Promise<{ linkId: string }> }) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const { linkId } = await params;
  const result = await respondToLinkRequest(supabase, linkId, "rejected");
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json({ status: "rejected" });
}
