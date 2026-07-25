"use client";

import type { ReactNode } from "react";
import { Header } from "@/design-system/layouts/Header";
import { Sidebar, BottomTabBar, type NavItem } from "@/design-system/layouts/Sidebar";
import { DashboardIcon, CurriculumIcon, ClassesIcon, ReportsIcon, EvaluationIcon } from "@/design-system/icons";
import styles from "./TeacherShell.module.css";

/**
 * Matches the approved Design System wireframe (docs/design-system/
 * 04-UX-Design-Experiences.md §9.2), not the full 12-module list from
 * docs/ui-architecture/03_Teacher_Studio.md. Evaluation was added
 * (Demo Readiness Sprint) to fix a discoverability gap -- it previously
 * had no nav entry at all, only a "More tools" link one level down.
 */
const TEACHER_NAV_ITEMS: NavItem[] = [
  { label: "Studio", href: "/studio", icon: DashboardIcon },
  { label: "Curriculum", href: "/studio/curriculum", icon: CurriculumIcon },
  { label: "Classes", href: "/studio/classes", icon: ClassesIcon },
  { label: "Reports", href: "/studio/analytics", icon: ReportsIcon },
  { label: "Evaluation", href: "/studio/evaluation", icon: EvaluationIcon },
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
      <Header userEmail={userEmail} homeHref="/studio" />
      <div className={styles.body}>
        <Sidebar items={TEACHER_NAV_ITEMS} />
        <main className={styles.content}>{children}</main>
      </div>
      <BottomTabBar items={TEACHER_NAV_ITEMS} />
    </div>
  );
}
