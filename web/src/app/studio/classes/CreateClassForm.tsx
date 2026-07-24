"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/design-system/primitives/Button";
import { AddIcon } from "@/design-system/icons";
import styles from "./page.module.css";

/** Inline create-class form -- same plain-input convention as ProfileForm/SettingsForm, no modal. */
export function CreateClassForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");

    const res = await fetch("/api/teacher/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, grade: grade ? Number(grade) : null }),
    });

    if (!res.ok) {
      setStatus("error");
      return;
    }

    setName("");
    setGrade("");
    setStatus("idle");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <AddIcon size={16} aria-hidden="true" /> Create class
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.createForm}>
      <input
        type="text"
        placeholder="Class name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={styles.input}
      />
      <input
        type="number"
        placeholder="Grade (optional)"
        value={grade}
        onChange={(e) => setGrade(e.target.value)}
        className={styles.inputSmall}
      />
      {status === "error" && <p className={styles.errorBanner}>Couldn&apos;t create that class. Please try again.</p>}
      <Button type="submit" loading={status === "saving"}>
        Save
      </Button>
      <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  );
}
