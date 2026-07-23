import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type LinkActionResult = { ok: true } | { ok: false; error: string };

/**
 * Thin wrappers over the SECURITY DEFINER functions from
 * 0016_parent_link_verification.sql -- respond_to_link_request and
 * revoke_parent_link are each the sole enforcement point for their
 * transition (auth.uid() checked inside the function itself, not
 * delegated to RLS), so these wrappers just call them and translate
 * Postgres exceptions into a plain result. Shared by both the
 * student-facing and parent-facing routes, since both roles can call
 * revoke_parent_link on a link they're a party to.
 */
export async function respondToLinkRequest(
  supabase: SupabaseServerClient,
  linkId: string,
  decision: "verified" | "rejected",
): Promise<LinkActionResult> {
  const { error } = await supabase.rpc("respond_to_link_request", { p_link_id: linkId, p_decision: decision });
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function revokeLink(supabase: SupabaseServerClient, linkId: string): Promise<LinkActionResult> {
  const { error } = await supabase.rpc("revoke_parent_link", { p_link_id: linkId });
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
