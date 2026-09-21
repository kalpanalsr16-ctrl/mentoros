"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/design-system/primitives/Avatar";
import { Button } from "@/design-system/primitives/Button";
import { ThemeToggle } from "@/design-system/layouts/ThemeToggle";
import { LogOutIcon, TransparencyIcon, ChevronDownIcon } from "@/design-system/icons";
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
  /**
   * Where the wordmark links to. Defaults to "/" (the public landing
   * page) only for callers that don't know better — every authenticated
   * shell should pass its own role-aware home so the logo never sends a
   * signed-in user to the "Coming soon" marketing stub.
   */
  homeHref?: string;
  /**
   * Optional account links shown in a small popover behind the avatar
   * (Profile, Settings, Parent Requests, ...). Omitted by default so
   * Teacher Studio's Header call site is unaffected — only the Learner
   * shell passes this, since its persistent nav is intentionally just
   * the four primary destinations and account-management pages live
   * here instead of crowding that nav.
   */
  accountItems?: { label: string; href: string }[];
};

/**
 * Shared header for every authenticated shell (Teacher Studio, Learner,
 * Parent Portal). No mobile menu-toggle button: each shell's own Sidebar
 * swaps itself for a bottom tab bar below `md`
 * (docs/design-system/02-Technical-Design-Foundations.md §15) rather
 * than needing a drawer toggle, so Header stays identical across shells.
 */
export function Header({ userEmail, homeHref, accountItems }: HeaderProps) {
  const { signOut, isSigningOut } = useSignOut();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Wordmark href={homeHref} />
      </div>
      <div className={styles.right}>
        {/* Epic E6: standalone entry point, per 06_Dashboard_Architecture.md's
            "reached from Teacher Studio's sidebar and via direct link" --
            Teacher Studio doesn't exist yet, so Header (present on every
            authenticated shell) is the direct-link entry point in the
            meantime. */}
        <Link href="/explorer" className={styles.explorerLink}>
          <TransparencyIcon size={16} aria-hidden="true" />
          <span>Explorer</span>
        </Link>
        <ThemeToggle />
        {userEmail && accountItems && accountItems.length > 0 ? (
          <div className={styles.accountMenu} ref={menuRef}>
            <button
              type="button"
              className={styles.accountTrigger}
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <Avatar label={userEmail} />
              <span className={styles.email}>{userEmail}</span>
              <ChevronDownIcon size={16} aria-hidden="true" />
            </button>
            {menuOpen && (
              <div className={styles.accountPopover} role="menu">
                {accountItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    className={styles.accountPopoverLink}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          userEmail && (
            <>
              <span className={styles.email}>{userEmail}</span>
              <Avatar label={userEmail} />
            </>
          )
        )}
        <Button variant="ghost" size="sm" onClick={signOut} loading={isSigningOut} aria-label="Sign out">
          <LogOutIcon size={16} aria-hidden="true" />
          <span>Sign out</span>
        </Button>
      </div>
    </header>
  );
}
