import type { createClient } from "@/lib/supabase/server";
import { deriveDisplayStatus, type LinkStatus } from "@/lib/parent-links/derive-display-status";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type ParentLinkRow = {
  linkId: string;
  studentId: string;
  status: LinkStatus;
  createdAt: string;
};

/**
 * The parent's own `/parent/children` screen. Deliberately does NOT
 * join `profiles` for the student's name -- no policy grants a parent
 * that read, verified or not (see 0016_parent_link_verification.sql's
 * note on the one-directional profiles policy, kept that way so
 * "verified but H3 doesn't exist yet" still means zero extra access).
 * The student id shown here is never new information to the parent --
 * it's the same id they typed in to request the link.
 */
export async function listLinksForParent(supabase: SupabaseServerClient, parentId: string): Promise<ParentLinkRow[]> {
  const { data: linkRows, error } = await supabase
    .from("parent_links")
    .select("id, student_id, status, created_at, expires_at")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: false });

  if (error || !linkRows) return [];

  return linkRows.map((r) => ({
    linkId: r.id,
    studentId: r.student_id,
    status: deriveDisplayStatus(r.status as LinkStatus, r.expires_at),
    createdAt: r.created_at,
  }));
}
