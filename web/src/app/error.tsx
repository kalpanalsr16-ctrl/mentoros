"use client";

import Link from "next/link";
import { Card } from "@/design-system/primitives/Card";
import { Button } from "@/design-system/primitives/Button";
import styles from "./error.module.css";

/**
 * App-level error boundary -- catches anything thrown by a page or layout
 * under this root that doesn't define its own error.tsx (none do today).
 * Deliberately generic: never renders `error.message` or `error.digest`
 * to the user, on-brand via the same Card/Button/token set every other
 * page uses rather than Next.js's default unstyled crash screen. "/sign-in"
 * is the one safe route back regardless of the user's role or auth state --
 * this boundary has no cheap way to know which shell a signed-in user
 * belongs in, and re-deriving that here would be new functionality, not a
 * bug fix.
 */
export default function GlobalErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className={styles.main}>
      <Card className={styles.card}>
        <h1 className={styles.heading}>Something went wrong</h1>
        <p className={styles.body}>
          This page hit an unexpected error. You can try again, or head back to sign in.
        </p>
        <div className={styles.actions}>
          <Button onClick={reset}>Try again</Button>
          <Link href="/sign-in">Back to sign in</Link>
        </div>
      </Card>
    </main>
  );
}
