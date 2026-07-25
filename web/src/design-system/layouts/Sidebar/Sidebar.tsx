"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import styles from "./Sidebar.module.css";

export type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
};

/**
 * Picks, at most, one active item per pathname. Plain
 * `pathname.startsWith(href)` broke this: Dashboard's own href ("/studio")
 * is a string-prefix of every other item's href too, so it stayed active
 * on every Studio route -- including deep routes with no nav item of their
 * own (Lessons, Assessments, Evaluation, Assistant, etc.), which have no
 * more specific sibling to "win" the longest-match comparison and so would
 * still fall through to "/studio" matching by prefix alone.
 *
 * The actual rule: an item whose href is a path-segment ancestor of a
 * sibling item's href (i.e. "/studio" is ancestor to "/studio/classes")
 * can only ever be active on an *exact* match of its own href -- never by
 * prefix -- since prefix-matching it would also catch every unrelated
 * deep route under the same section. Every other item (no sibling is
 * nested under it) keeps matching by prefix too, so its own detail/sub
 * routes (e.g. "/studio/classes/:classId") correctly stay highlighted.
 */
function findActiveHref(pathname: string, items: NavItem[]): string | null {
  let best: string | null = null;
  for (const { href } of items) {
    const isAncestorOfSibling = items.some((other) => other.href !== href && other.href.startsWith(`${href}/`));
    const matches = isAncestorOfSibling ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
    if (matches && (best === null || href.length > best.length)) {
      best = href;
    }
  }
  return best;
}

/**
 * Teacher Studio's persistent nav (docs/design-system/04-UX-Design-Experiences.md
 * §9.2) — visible at `md`+; BottomTabBar below takes over under `md`.
 * Sprint 1 scope: pure navigation chrome, four top-level items matching
 * the approved Design System wireframe exactly. It links to routes whose
 * actual module content (Lesson Planner, Assessment Builder, etc.) is
 * explicitly out of scope for this sprint — see the placeholder pages.
 */
export function Sidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const activeHref = findActiveHref(pathname, items);
  return (
    <nav className={styles.sidebar} aria-label="Studio navigation">
      {items.map(({ label, href, icon: Icon }) => {
        const active = href === activeHref;
        return (
          <Link
            key={href}
            href={href}
            className={`${styles.link} ${active ? styles.linkActive : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={18} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** The below-`md` replacement for Sidebar — same nav items, bottom-fixed. */
export function BottomTabBar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const activeHref = findActiveHref(pathname, items);
  return (
    <nav className={styles.bottomBar} aria-label="Studio navigation">
      {items.map(({ label, href, icon: Icon }) => {
        const active = href === activeHref;
        return (
          <Link
            key={href}
            href={href}
            className={`${styles.bottomBarLink} ${active ? styles.bottomBarLinkActive : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={20} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
