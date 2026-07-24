"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/design-system/primitives/Button";

/** Row-level delete on the lessons list -- hard delete, confirm() is enough (no downstream data to lose, per the approved design). */
export function DeleteLessonButton({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!window.confirm("Delete this lesson plan? This can't be undone.")) return;

    setDeleting(true);
    const res = await fetch(`/api/teacher/lessons/${lessonId}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      setDeleting(false);
    }
  }

  return (
    <Button variant="danger" size="sm" loading={deleting} onClick={handleDelete}>
      Delete
    </Button>
  );
}
