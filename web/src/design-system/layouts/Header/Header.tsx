"use client";

import Link from "next/link";
import { Avatar } from "@/design-system/primitives/Avatar";
import { Button } from "@/design-system/primitives/Button";
import { ThemeToggle } from "@/design-system/layouts/ThemeToggle";
import { LogOutIcon, TransparencyIcon } from "@/design-system/icons";
import { useSignOut } from "@/lib/supabase/use-sign-out";
import styles from "./Header.module.css";

/**
 * The one approved wordmark treatment (Brand Identity §2.3) — exported
 * separately so the Landing page (Marketing template) can reuse it
 * without pulling in the rest of Header's auth-shell chrome.
 */
export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className={styles.wordmark}>
      Mentor<span className={styles.wordmarkAccent}>OS</span>
    </Link>
  );
}

export type HeaderProps = {
  userEmail?: string;
};

/**
 * Shared header for every authenticated shell. Deliberately does NOT
 * render inside /chat (untouched this sprint) — /chat keeps its own
 * existing inline header exactly as-is. No mobile menu-toggle button:
 * Teacher Studio's Sidebar swaps itself for a bottom tab bar below `md`
 * (docs/design-system/02-Technical-Design-Foundations.md §15) rather
 * than needing a drawer toggle, so Header stays identical across shells.
 */
export function Header({ userEmail }: HeaderProps) {
  const { signOut, isSigningOut } = useSignOut();

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Wordmark />
      </div>
      <div className={styles.right}>
        {/* Epic E6: standalone entry point, per 06_Dashboard_Architecture.md's
            "reached from Teacher Studio's sidebar and via direct link" --
            Teacher Studio doesn't exist yet, so Header (present on every
            authenticated shell except /chat) is the direct-link entry point
            in the meantime. */}
        <Link href="/explorer" className={styles.explorerLink}>
          <TransparencyIcon size={16} aria-hidden="true" />
          <span>Explorer</span>
        </Link>
        <ThemeToggle />
        {userEmail && (
          <>
            <span className={styles.email}>{userEmail}</span>
            <Avatar label={userEmail} />
          </>
        )}
        <Button variant="ghost" size="sm" onClick={signOut} loading={isSigningOut} aria-label="Sign out">
          <LogOutIcon size={16} aria-hidden="true" />
          <span>Sign out</span>
        </Button>
      </div>
    </header>
  );
}
