import { createClient } from "@supabase/supabase-js";

/**
 * Bypasses RLS entirely — server-only, never imported by anything that
 * runs in the browser. Used where a request has no signed-in user to
 * scope by, but the data is either synthetic (golden-eval runs) or
 * deliberately public (the /eval showcase page reads a completed run for
 * anyone, not just its owning teacher).
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("createServiceRoleClient: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
