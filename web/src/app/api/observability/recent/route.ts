import { createClient } from "@/lib/supabase/server";
import { getRecentTraces } from "@/lib/observability/get-recent-traces";

/**
 * Read-only recent-traces feed for Architecture Explorer (Epic E6) --
 * reads `events` through the caller's own RLS-scoped session, same as
 * GET /api/observability/trace/:traceId (Epic E2). No new agent
 * behavior, no new access model: ownership is enforced by the events
 * table's self-read policy, not by application code here.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;
  const workflow = url.searchParams.get("workflow") ?? undefined;
  const errorsOnly = url.searchParams.get("errorsOnly") === "true";

  const recentTracesData = await getRecentTraces(supabase, { from, to, workflow, errorsOnly });

  if (!recentTracesData) {
    return Response.json({ error: "Could not load recent traces." }, { status: 500 });
  }

  return Response.json(recentTracesData);
}
