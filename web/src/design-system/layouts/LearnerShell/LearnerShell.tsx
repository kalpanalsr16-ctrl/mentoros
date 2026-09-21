"use client";

import type { ReactNode } from "react";
import { Header } from "@/design-system/layouts/Header";
import { Sidebar, BottomTabBar, type NavItem } from "@/design-system/layouts/Sidebar";
import { AskMentorIcon, AiTutorIcon, MyLearningIcon, DevBriefIcon } from "@/design-system/icons";
import styles from "./LearnerShell.module.css";

/**
 * The four learner-facing destinations (ASK -> LEARN -> REMEMBER -> TRUST,
 * per the redesign brief). Dev Brief is a `secondaryItem` on Sidebar --
 * same nav, visually separated at the bottom -- since it's aimed at a
 * technical reviewer, not part of the learner's own day-to-day loop.
 */
const PRIMARY_NAV_ITEMS: NavItem[] = [
  { label: "Ask Mentor", href: "/chat", icon: AskMentorIcon },
  { label: "AI Tutor", href: "/tutor", icon: AiTutorIcon },
  { label: "My Learning", href: "/learning", icon: MyLearningIcon },
];

const SECONDARY_NAV_ITEMS: NavItem[] = [{ label: "Dev Brief", href: "/dev-brief", icon: DevBriefIcon }];

/**
 * Account-management pages deliberately excluded from the primary/
 * secondary nav (would crowd the four-destination sidebar) -- reachable
 * instead via the avatar menu in Header, per the redesign's account-menu
 * decision.
 */
const ACCOUNT_ITEMS = [
  { label: "Profile", href: "/app/profile" },
  { label: "Achievements", href: "/app/achievements" },
  { label: "Parent requests", href: "/app/parent-requests" },
  { label: "Settings", href: "/app/settings" },
];

export type LearnerShellProps = {
  userEmail?: string;
  children: ReactNode;
  /**
   * Opts the content region out of the default padding + independent
   * scroll (`overflow-y: auto`) so a page that manages its own internal
   * scroll -- Ask Mentor's message list + pinned input -- gets the full
   * box instead. Every other learner page (Progress, My Learning, Dev
   * Brief, ...) leaves this false and gets the normal scrollable page.
   */
  fullBleed?: boolean;
};

/**
 * Persistent-nav shell for every learner-facing route (Ask Mentor, AI
 * Tutor, My Learning, Dev Brief) -- the structural template is
 * TeacherShell's (Header + Sidebar + BottomTabBar + content), reused
 * as a pattern rather than shared as one component since the two shells'
 * nav items and Header homeHref genuinely differ per role.
 */
export function LearnerShell({ userEmail, children, fullBleed = false }: LearnerShellProps) {
  return (
    <div className={styles.shell}>
      <Header userEmail={userEmail} homeHref="/chat" accountItems={ACCOUNT_ITEMS} />
      <div className={styles.body}>
        <Sidebar items={PRIMARY_NAV_ITEMS} secondaryItems={SECONDARY_NAV_ITEMS} ariaLabel="Learner navigation" />
        <main className={fullBleed ? styles.contentFullBleed : styles.content}>{children}</main>
      </div>
      <BottomTabBar items={[...PRIMARY_NAV_ITEMS, ...SECONDARY_NAV_ITEMS]} />
    </div>
  );
}
