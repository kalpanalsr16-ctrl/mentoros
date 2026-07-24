import Link from "next/link";
import { PageContainer } from "@/design-system/layouts/PageContainer";
import styles from "./Footer.module.css";

/**
 * Used on the Marketing template (Landing) per
 * docs/ui-architecture/01_Application_Map.md — deliberately not used
 * inside Student/Teacher/Parent app shells, matching the standard
 * pattern of no footer inside an authenticated app surface.
 */
export function Footer() {
  return (
    <footer className={styles.footer}>
      <PageContainer>
        <div className={styles.inner}>
          <span>&copy; {new Date().getFullYear()} MentorOS</span>
          <nav className={styles.links} aria-label="Footer">
            <Link href="/sign-in">Sign in</Link>
            <Link href="/sign-up">Sign up</Link>
          </nav>
        </div>
      </PageContainer>
    </footer>
  );
}
