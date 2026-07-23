import type { createClient } from "@/lib/supabase/server";
import { deriveDisplayStatus, type LinkStatus } from "@/lib/parent-links/derive-display-status";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type StudentLinkRow = {
  linkId: string;
  parentName: string;
  status: LinkStatus;
  createdAt: string;
};

/**
 * The student's own `/app/parent-requests` screen needs every link
 * regardless of status (pending to act on, verified/revoked/rejected to
 * show as history) -- unlike list-pending-requests.ts, which stays
 * narrowly scoped to the 'pending' rows GET /api/student/parent-requests
 * already returns. Both read the same table; this one doesn't replace
 * that route, it serves the page directly (a server component, no
 * self-fetch needed).
 */
export async function listLinksForStudent(supabase: SupabaseServerClient, studentId: string): Promise<StudentLinkRow[]> {
  const { data: linkRows, error } = await supabase
    .from("parent_links")
    .select("id, parent_id, status, created_at, expires_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error || !linkRows || linkRows.length === 0) return [];

  const parentIds = [...new Set(linkRows.map((r) => r.parent_id))];
  const { data: profileRows } = await supabase.from("profiles").select("id, display_name").in("id", parentIds);
  const nameById = new Map((profileRows ?? []).map((p) => [p.id, p.display_name ?? "A parent"]));

  return linkRows.map((r) => ({
    linkId: r.id,
    parentName: nameById.get(r.parent_id) ?? "A parent",
    status: deriveDisplayStatus(r.status as LinkStatus, r.expires_at),
    createdAt: r.created_at,
  }));
}
