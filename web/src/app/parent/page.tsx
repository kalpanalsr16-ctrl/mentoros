import Link from "next/link";
import { PlaceholderPage } from "@/design-system/layouts/PlaceholderPage";
import styles from "./page.module.css";

/**
 * The Weekly Summary itself (H3) stays blocked until a verified link
 * exists to summarize -- see 04_Parent_Portal.md. The link below to
 * /parent/children (Parent Verification & Consent, v1) is what actually
 * gets a parent to a verified link in the first place.
 */
export default function ParentDashboardPage() {
  return (
    <>
      <PlaceholderPage
        title="Weekly summary"
        description="A plain-language digest of your child's learning will live here, once you're linked to a child's account."
      />
      <Link href="/parent/children" className={styles.childrenLink}>
        Link a child →
      </Link>
    </>
  );
}
