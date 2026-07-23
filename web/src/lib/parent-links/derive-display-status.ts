export type LinkStatus = "pending" | "verified" | "rejected" | "expired" | "revoked";

/**
 * No scheduled job ever flips a stale row's `status` column from
 * 'pending' to 'expired' -- `expires_at` is only ever compared at the
 * moment `respond_to_link_request()` runs (0016_parent_link_verification.sql).
 * A request nobody responds to stays literally 'pending' in the
 * database forever, so every UI that lists requests must derive the
 * display status from `expires_at` itself rather than trusting the raw
 * column -- otherwise a long-dead request would still render its
 * Approve/Reject buttons.
 */
export function deriveDisplayStatus(status: LinkStatus, expiresAt: string, now: Date = new Date()): LinkStatus {
  if (status === "pending" && new Date(expiresAt).getTime() < now.getTime()) {
    return "expired";
  }
  return status;
}
