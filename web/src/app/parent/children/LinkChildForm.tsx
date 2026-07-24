"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/design-system/primitives/Button";
import styles from "./page.module.css";

type Status = "idle" | "sending" | "sent" | "error";

/**
 * `POST /api/parent/link-request` always resolves to the same generic
 * outcome (per the anti-enumeration design) unless rate-limited, so this
 * form never claims to know whether the id was real, already linked, or
 * brand new -- it can only ever say "request sent," matching the API's
 * own guarantee.
 */
export function LinkChildForm() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("sending");
    setError(null);

    const response = await fetch("/api/parent/link-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Something went wrong. Please try again.");
      setStatus("error");
      return;
    }

    setStatus("sent");
    setStudentId("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <label htmlFor="studentId" className={styles.fieldLabel}>
        Student account ID
      </label>
      <input
        id="studentId"
        required
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
        placeholder="Ask your child for their account ID"
        className={styles.input}
      />
      {error && <p className={styles.errorBanner}>{error}</p>}
      {status === "sent" && (
        <p className={styles.savedNote}>
          Request sent. Your child will need to approve it before you&apos;re linked.
        </p>
      )}
      <Button type="submit" loading={status === "sending"}>
        Send request
      </Button>
    </form>
  );
}
