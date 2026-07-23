"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/design-system/primitives/Button";
import { AddIcon } from "@/design-system/icons";
import styles from "./page.module.css";

/** Create-then-edit, same convention as CreateClassForm: a title alone creates the shell, then the detail page's builder fills in the questions. */
export function CreateAssessmentForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");

    const res = await fetch("/api/teacher/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, questions: [] }),
    });

    if (!res.ok) {
      setStatus("error");
      return;
    }

    const { id } = await res.json();
    router.push(`/studio/assessments/${id}`);
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <AddIcon size={16} aria-hidden="true" /> New assessment
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.createForm}>
      <input
        type="text"
        placeholder="Assessment title"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className={styles.input}
      />
      {status === "error" && <p className={styles.errorBanner}>Couldn&apos;t create that assessment. Please try again.</p>}
      <Button type="submit" loading={status === "saving"}>
        Create
      </Button>
      <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  );
}
