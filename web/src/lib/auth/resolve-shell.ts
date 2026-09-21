/**
 * Role -> route-namespace mapping, per
 * docs/ui-architecture/01_Application_Map.md's "Route-to-role summary".
 * Kept as a pure function (tested directly, no DB/session dependency)
 * so the three route-group layouts (web/src/app/{app,studio,parent}/layout.tsx)
 * share one source of truth for "where does this role belong" rather
 * than each hardcoding its own redirect target.
 */
export type Role = "student" | "teacher" | "parent";

export const ROLE_SHELL_PATH: Record<Role, string> = {
  // Ask Mentor (learner UI redesign) is the student's true default
  // screen now, not the retired /app Dashboard -- /app still exists and
  // redirects to /chat for old links, but every fresh redirect target
  // should go straight there.
  student: "/chat",
  teacher: "/studio",
  parent: "/parent",
};

export function resolveShellForRole(role: string): string {
  if (role === "student" || role === "teacher" || role === "parent") {
    return ROLE_SHELL_PATH[role];
  }
  // Unknown/legacy role value -- fail toward the narrowest experience
  // rather than guessing, matching this codebase's established
  // "uncertainty resolves toward caution" convention (11_Policy_Engine.md).
  return ROLE_SHELL_PATH.student;
}
