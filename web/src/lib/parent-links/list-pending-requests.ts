import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type PendingLinkRequest = {
  linkId: string;
  parentName: string;
  requestedAt: string;
};

/**
 * `GET /api/student/parent-requests` -- reads the student's own pending
 * parent_links rows (self-read RLS from 0015, unchanged) plus the
 * requesting parent's display_name, now readable via 0016's new
 * one-directional profiles policy.
 */
export async function listPendingRequestsForStudent(supabase: SupabaseServerClient, studentId: string): Promise<PendingLinkRequest[]> {
  const { data: linkRows, error: linkError } = await supabase
    .from("parent_links")
    .select("id, parent_id, created_at")
    .eq("student_id", studentId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (linkError || !linkRows || linkRows.length === 0) return [];

  const parentIds = [...new Set(linkRows.map((r) => r.parent_id))];
  const { data: profileRows } = await supabase.from("profiles").select("id, display_name").in("id", parentIds);
  const nameById = new Map((profileRows ?? []).map((p) => [p.id, p.display_name ?? "A parent"]));

  return linkRows.map((r) => ({
    linkId: r.id,
    parentName: nameById.get(r.parent_id) ?? "A parent",
    requestedAt: r.created_at,
  }));
}
