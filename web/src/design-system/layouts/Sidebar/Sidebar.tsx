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

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
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
  return (
    <nav className={styles.sidebar} aria-label="Studio navigation">
      {items.map(({ label, href, icon: Icon }) => {
        const active = isActive(pathname, href);
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
  return (
    <nav className={styles.bottomBar} aria-label="Studio navigation">
      {items.map(({ label, href, icon: Icon }) => {
        const active = isActive(pathname, href);
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
