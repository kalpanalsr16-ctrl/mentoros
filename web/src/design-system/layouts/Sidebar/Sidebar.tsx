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
 * Persistent nav shared by every shell that has one (Teacher Studio,
 * Learner) — visible at `md`+; BottomTabBar below takes over under `md`.
 * `secondaryItems` renders as its own group pushed to the bottom of the
 * same `<nav>` (so the border-right stays one continuous line, not two
 * stacked elements) — used for a destination that belongs in the same
 * nav but should read as visually separate, e.g. Learner's "Dev Brief".
 * Omitting it changes nothing for existing callers.
 */
export function Sidebar({
  items,
  secondaryItems,
  ariaLabel = "Studio navigation",
}: {
  items: NavItem[];
  secondaryItems?: NavItem[];
  ariaLabel?: string;
}) {
  const pathname = usePathname();
  const allItems = secondaryItems ? [...items, ...secondaryItems] : items;
  const activeHref = findActiveHref(pathname, allItems);

  function renderLink({ label, href, icon: Icon }: NavItem) {
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
  }

  return (
    <nav className={styles.sidebar} aria-label={ariaLabel}>
      {items.map(renderLink)}
      {secondaryItems && (
        <>
          <div className={styles.secondarySpacer} />
          <div className={styles.secondaryDivider} />
          {secondaryItems.map(renderLink)}
        </>
      )}
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
