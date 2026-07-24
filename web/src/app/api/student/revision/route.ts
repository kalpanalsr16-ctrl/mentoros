import { createClient } from "@/lib/supabase/server";
import { getRevisionData } from "@/lib/revision/get-revision-data";

/**
 * Read-only revision due-list (Epic F6) -- calls no agent. Query/shaping
 * logic lives in getRevisionData() (lib/revision/), shared with
 * app/app/revision/page.tsx's own server-side render.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const studentId = claimsData.claims.sub as string;
  const revisionData = await getRevisionData(supabase, studentId);

  if (!revisionData) {
    return Response.json({ error: "Could not load your revision plan." }, { status: 500 });
  }

  return Response.json(revisionData);
}
