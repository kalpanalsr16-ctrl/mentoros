"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/design-system/primitives/Button";
import styles from "./page.module.css";

type Decision = "approve" | "reject";

/** A pending request's Approve/Reject pair -- each posts to its own route (both call respond_to_link_request internally, per 0016). */
export function ParentRequestActions({ linkId }: { linkId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDecision(decision: Decision) {
    setPending(decision);
    setError(null);
    const response = await fetch(`/api/student/parent-requests/${linkId}/${decision}`, { method: "POST" });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Something went wrong. Please try again.");
      setPending(null);
      return;
    }
    router.refresh();
  }

  return (
    <div className={styles.actions}>
      <Button size="sm" loading={pending === "approve"} disabled={pending === "reject"} onClick={() => handleDecision("approve")}>
        Approve
      </Button>
      <Button
        variant="secondary"
        size="sm"
        loading={pending === "reject"}
        disabled={pending === "approve"}
        onClick={() => handleDecision("reject")}
      >
        Reject
      </Button>
      {error && <p className={styles.actionError}>{error}</p>}
    </div>
  );
}
