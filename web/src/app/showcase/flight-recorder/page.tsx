import { createClient } from "@/lib/supabase/server";
import { getRecentTraces } from "@/lib/observability/get-recent-traces";
import { ExplorerView } from "@/components/showcase/ExplorerView";

export default async function FlightRecorderPage() {
  const supabase = await createClient();
  const initialData = await getRecentTraces(supabase, {});

  return <ExplorerView initialData={initialData} />;
}
