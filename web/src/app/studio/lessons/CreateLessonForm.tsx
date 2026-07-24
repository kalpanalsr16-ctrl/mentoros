"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/design-system/primitives/Button";
import { AddIcon } from "@/design-system/icons";
import styles from "./page.module.css";

/** Create-then-edit, same convention as CreateAssessmentForm: title + class creates the shell; grade/subject/concept/content are filled in on the detail page. */
export function CreateLessonForm({ classes }: { classes: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");

    const res = await fetch("/api/teacher/lessons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, classId }),
    });

    if (!res.ok) {
      setStatus("error");
      return;
    }

    const { id } = await res.json();
    router.push(`/studio/lessons/${id}`);
  }

  if (classes.length === 0) {
    return <p className={styles.body}>Create a class first to start planning lessons.</p>;
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <AddIcon size={16} aria-hidden="true" /> New lesson
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.createForm}>
      <input
        type="text"
        placeholder="Lesson title"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className={styles.input}
      />
      <select value={classId} onChange={(e) => setClassId(e.target.value)} className={styles.classSelect} aria-label="Class">
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {status === "error" && <p className={styles.errorBanner}>Couldn&apos;t create that lesson. Please try again.</p>}
      <Button type="submit" loading={status === "saving"}>
        Create
      </Button>
      <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  );
}
