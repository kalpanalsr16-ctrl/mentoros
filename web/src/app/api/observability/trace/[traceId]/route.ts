import { createClient } from "@/lib/supabase/server";
import { createPostgresTransparencyProvider } from "@/lib/observability/postgres-transparency-provider";

/**
 * Thin, read-only wrapper around TransparencyProvider for the AI
 * Transparency Panel (docs/ui-architecture/07_AI_Transparency_Panel.md,
 * Epic E2). No new agent behavior -- this only reads events already
 * logged by /api/chat. Ownership is enforced by the events table's
 * self-read RLS policy (0006_events_self_read.sql), not by application
 * code here: a signed-in student's session client physically cannot see
 * another student's rows, so a mismatched traceId and a nonexistent one
 * are indistinguishable and both correctly 404.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ traceId: string }> },
) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const { traceId } = await params;
  const transparencyProvider = createPostgresTransparencyProvider(supabase);
  const traceView = await transparencyProvider.getTraceView(traceId);

  if (!traceView) {
    return Response.json({ error: "Trace not found." }, { status: 404 });
  }

  return Response.json(traceView);
}
