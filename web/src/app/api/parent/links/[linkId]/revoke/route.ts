import { requireParent } from "@/lib/parent/require-parent";
import { revokeLink } from "@/lib/parent-links/link-actions";

/** `POST /api/parent/links/:linkId/revoke` -- a parent voluntarily ending their own verified link. */
export async function POST(_request: Request, { params }: { params: Promise<{ linkId: string }> }) {
  const auth = await requireParent();
  if ("error" in auth) return auth.error;

  const { linkId } = await params;
  const result = await revokeLink(auth.supabase, linkId);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json({ status: "revoked" });
}
