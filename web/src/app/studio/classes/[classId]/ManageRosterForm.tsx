"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/design-system/primitives/Button";
import { RemoveStudentIcon } from "@/design-system/icons";
import styles from "./page.module.css";

type AddProps = { classId: string; mode: "add"; studentId?: never };
type RemoveProps = { classId: string; mode: "remove"; studentId: string };

/**
 * Teacher-managed roster mutation only (Epic G3) -- adds/removes a
 * student by their exact account id via /api/teacher/classes/:classId/
 * students. No self-enrollment/join-code UI exists anywhere in this
 * sprint's scope.
 */
export function ManageRosterForm(props: AddProps | RemoveProps) {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setError(null);

    const res = await fetch(`/api/teacher/classes/${props.classId}/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setStatus("error");
      setError(body?.error ?? "Couldn't add that student.");
      return;
    }

    setStudentId("");
    setStatus("idle");
    router.refresh();
  }

  async function handleRemove() {
    if (props.mode !== "remove") return;
    setStatus("saving");

    const res = await fetch(`/api/teacher/classes/${props.classId}/students/${props.studentId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      setStatus("error");
      return;
    }

    router.refresh();
  }

  if (props.mode === "remove") {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={handleRemove} loading={status === "saving"}>
        <RemoveStudentIcon size={16} aria-hidden="true" />
        <span className={styles.srOnly}>Remove from class</span>
      </Button>
    );
  }

  return (
    <form onSubmit={handleAdd} className={styles.addForm}>
      <input
        type="text"
        placeholder="Student account ID"
        required
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
        className={styles.input}
      />
      <Button type="submit" loading={status === "saving"}>
        Add
      </Button>
      {status === "error" && <p className={styles.errorBanner}>{error}</p>}
    </form>
  );
}
