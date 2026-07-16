import type { ReactNode } from "react";
import { Header } from "@/design-system/layouts/Header";
import { PageContainer } from "@/design-system/layouts/PageContainer";
import styles from "./MinimalShell.module.css";

export type MinimalShellProps = {
  userEmail?: string;
  children: ReactNode;
};

/**
 * Minimal, single-path shell — a thin header only, no persistent nav
 * beyond it. Shared by both /app (Student, per
 * docs/design-system/04-UX-Design-Experiences.md §9.1) and /parent
 * (Parent Portal, per docs/ui-architecture/04_Parent_Portal.md's own
 * "no sidebar" note) — the two experiences are structurally identical
 * at the shell level, so this is one component, not two, per this
 * sprint's zero-duplication requirement. Deliberately not used by
 * /chat, which keeps its own existing header untouched this sprint.
 */
export function MinimalShell({ userEmail, children }: MinimalShellProps) {
  return (
    <div className={styles.shell}>
      <Header userEmail={userEmail} />
      <main className={styles.content}>
        <PageContainer>{children}</PageContainer>
      </main>
    </div>
  );
}
