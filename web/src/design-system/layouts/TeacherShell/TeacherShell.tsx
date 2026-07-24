"use client";

import type { ReactNode } from "react";
import { Header } from "@/design-system/layouts/Header";
import { Sidebar, BottomTabBar, type NavItem } from "@/design-system/layouts/Sidebar";
import { DashboardIcon, CurriculumIcon, ClassesIcon, ReportsIcon } from "@/design-system/icons";
import styles from "./TeacherShell.module.css";

/**
 * Four top-level items, matching the approved Design System wireframe
 * exactly (docs/design-system/04-UX-Design-Experiences.md §9.2) — not
 * the full 12-module list from docs/ui-architecture/03_Teacher_Studio.md,
 * which is that document's screen content, out of scope for this sprint.
 */
const TEACHER_NAV_ITEMS: NavItem[] = [
  { label: "Studio", href: "/studio", icon: DashboardIcon },
  { label: "Curriculum", href: "/studio/curriculum", icon: CurriculumIcon },
  { label: "Classes", href: "/studio/classes", icon: ClassesIcon },
  { label: "Reports", href: "/studio/analytics", icon: ReportsIcon },
];

export type TeacherShellProps = {
  userEmail?: string;
  children: ReactNode;
};

/**
 * Sidebar app-shell template (docs/design-system/04-UX-Design-Experiences.md
 * §9.2) — persistent Sidebar at `md`+, BottomTabBar below it. Wraps
 * every page under /studio.
 */
export function TeacherShell({ userEmail, children }: TeacherShellProps) {
  return (
    <div className={styles.shell}>
      <Header userEmail={userEmail} />
      <div className={styles.body}>
        <Sidebar items={TEACHER_NAV_ITEMS} />
        <main className={styles.content}>{children}</main>
      </div>
      <BottomTabBar items={TEACHER_NAV_ITEMS} />
    </div>
  );
}
