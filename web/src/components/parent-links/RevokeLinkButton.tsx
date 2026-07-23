"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/design-system/primitives/Button";
import styles from "./RevokeLinkButton.module.css";

const REVOKE_URL: Record<"student" | "parent", (linkId: string) => string> = {
  student: (linkId) => `/api/student/parent-links/${linkId}/revoke`,
  parent: (linkId) => `/api/parent/links/${linkId}/revoke`,
};

/**
 * Shared by both the student's "Linked parents" list and the parent's
 * "My requests" list -- revoke_parent_link() (0016) already authorizes
 * either party, so this is one component with a `role` prop rather than
 * two near-identical ones, matching this codebase's zero-duplication rule.
 */
export function RevokeLinkButton({ linkId, role }: { linkId: string; role: "student" | "parent" }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "revoking" | "error">("idle");

  async function handleRevoke() {
    setStatus("revoking");
    const response = await fetch(REVOKE_URL[role](linkId), { method: "POST" });
    if (!response.ok) {
      setStatus("error");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <Button variant="danger" size="sm" loading={status === "revoking"} onClick={handleRevoke}>
        Revoke access
      </Button>
      {status === "error" && <p role="alert" className={styles.error}>Couldn&apos;t revoke this link. Please try again.</p>}
    </div>
  );
}
