import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRecentTraces } from "@/lib/observability/get-recent-traces";
import { MinimalShell } from "@/design-system/layouts/MinimalShell";
import { ExplorerView } from "./ExplorerView";

/**
 * Architecture Explorer (Epic E6) -- docs/ui-architecture/
 * 06_Dashboard_Architecture.md's Architecture Explorer section. Full-page
 * reuse of the AI Transparency Panel's existing components (E3/E4) plus
 * a recent-traces feed (E2's own GET /api/observability/trace/:traceId
 * for the detail view, this sprint's new GET /api/observability/recent
 * for the list/charts). Shows only the signed-in account's own trace
 * history -- the events table's self-read RLS (0006_events_self_read.sql)
 * is the only access control here, per this sprint's explicit scoping
 * decision (no cross-student/admin view exists anywhere in this schema).
 */
export default async function ExplorerPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    redirect("/sign-in");
  }

  const initialData = await getRecentTraces(supabase, {});
  const email = claimsData.claims.email as string | undefined;

  return (
    <MinimalShell userEmail={email}>
      <ExplorerView initialData={initialData} />
    </MinimalShell>
  );
}
