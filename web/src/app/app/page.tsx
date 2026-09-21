import { redirect } from "next/navigation";

/**
 * The old Student Dashboard is retired as a destination (learner UI
 * redesign) -- Ask Mentor (/chat) is now the default screen, and this
 * page's former content (continue-learning prompt, streak, mastery
 * snapshot, revision suggestion) is folded into Ask Mentor's welcome
 * state and the My Learning overview instead. Kept as a redirect, not
 * deleted outright, so old bookmarks/links to /app still resolve.
 */
export default function StudentDashboardPage() {
  redirect("/chat");
}
