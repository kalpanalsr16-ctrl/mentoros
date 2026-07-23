"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/design-system/primitives/Button";

/** Row-level delete on the assessments list -- confirm() is enough here, same weight as a draft-content delete elsewhere in this app (no irreversible student-facing data is touched, per G9's own "authoring only" scope). */
export function DeleteAssessmentButton({ assessmentId }: { assessmentId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!window.confirm("Delete this assessment? This can't be undone.")) return;

    setDeleting(true);
    const res = await fetch(`/api/teacher/assessments/${assessmentId}`, { method: "DELETE" });
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
