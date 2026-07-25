"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BackToDashboardLink.module.css";

/**
 * Shell-level fix for the Demo Readiness Audit's P1 finding: every /app/*
 * subpage linked out from the Dashboard but none linked back, leaving
 * browser-back as the only way out. Rendered once in app/app/layout.tsx
 * rather than duplicated into each of the 9 subpages' own return
 * branches -- one shared component instead of ~20 near-identical edits.
 * Hidden on the Dashboard itself (linking to the page you're already on
 * would be dead weight, not navigation).
 */
export function BackToDashboardLink() {
  const pathname = usePathname();
  if (pathname === "/app") return null;

  return (
    <Link href="/app" className={styles.backLink}>
      ← Dashboard
    </Link>
  );
}
