"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Header } from "@/design-system/layouts/Header";
import styles from "./ShowcaseShell.module.css";

type ShowcaseSection = { label: string; href?: string };

/**
 * Information architecture for "Explore the AI System". Sections without an
 * href are the planned phases; they render as muted, non-clickable entries so
 * the structure is visible without any placeholder data behind them.
 */
const SECTIONS: ShowcaseSection[] = [
  { label: "Overview", href: "/showcase" },
  { label: "AI Flight Recorder", href: "/showcase/flight-recorder" },
  { label: "Dev Brief", href: "/showcase/dev-brief" },
  { label: "Learner Model", href: "/showcase/learner-model" },
  { label: "Evaluation Lab" },
  { label: "System Architecture" },
  { label: "Performance" },
  { label: "Experiments" },
  { label: "Technical Case Study" },
];

export function ShowcaseShell({ userEmail, children }: { userEmail?: string; children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className={styles.shell}>
      <Header userEmail={userEmail} homeHref="/chat" />
      <div className={styles.body}>
        <nav className={styles.nav} aria-label="Showcase sections">
          <Link href="/chat" className={styles.back}>
            &larr; Back to Ask Mentor
          </Link>
          <p className={styles.navEyebrow}>Explore the AI System</p>
          <ul className={styles.navList}>
            {SECTIONS.map((section) => {
              if (!section.href) {
                return (
                  <li key={section.label} className={styles.navItemPending}>
                    <span>{section.label}</span>
                    <span className={styles.navTag}>Next phase</span>
                  </li>
                );
              }
              const active = pathname === section.href;
              return (
                <li key={section.label}>
                  <Link
                    href={section.href}
                    className={active ? styles.navItemActive : styles.navItem}
                    aria-current={active ? "page" : undefined}
                  >
                    {section.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
