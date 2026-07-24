"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/design-system/primitives/Button";
import { AddIcon, CloseIcon } from "@/design-system/icons";
import { computeTotalPoints, type AssessmentQuestion } from "@/lib/teacher-assessments/assessment-builder-aggregation";
import styles from "./page.module.css";

type Status = "idle" | "saving" | "saved" | "error";

export function QuestionListBuilder({
  assessmentId,
  initialTitle,
  initialQuestions,
}: {
  assessmentId: string;
  initialTitle: string;
  initialQuestions: AssessmentQuestion[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>(initialQuestions);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  function addQuestion() {
    setQuestions((qs) => [...qs, { id: crypto.randomUUID(), text: "", points: 1 }]);
  }

  function removeQuestion(id: string) {
    setQuestions((qs) => qs.filter((q) => q.id !== id));
  }

  function updateQuestion(id: string, patch: Partial<AssessmentQuestion>) {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  async function handleSave() {
    setStatus("saving");
    setError(null);

    const res = await fetch(`/api/teacher/assessments/${assessmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, questions }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Couldn't save. Please try again.");
      setStatus("error");
      return;
    }

    setStatus("saved");
    router.refresh();
  }

  async function handleDelete() {
    if (!window.confirm("Delete this assessment? This can't be undone.")) return;
    const res = await fetch(`/api/teacher/assessments/${assessmentId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/studio/assessments");
      router.refresh();
    }
  }

  return (
    <div className={styles.builder}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Assessment title"
        className={styles.titleInput}
      />

      <div className={styles.questionList}>
        {questions.map((question, index) => (
          <div key={question.id} className={styles.questionRow}>
            <span className={styles.questionNumber}>{index + 1}</span>
            <textarea
              value={question.text}
              onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
              placeholder="Question text"
              className={styles.questionText}
              rows={2}
            />
            <input
              type="number"
              min={1}
              value={question.points}
              onChange={(e) => updateQuestion(question.id, { points: Number(e.target.value) })}
              className={styles.pointsInput}
              aria-label="Points"
            />
            <Button variant="ghost" size="sm" onClick={() => removeQuestion(question.id)} aria-label="Remove question">
              <CloseIcon size={16} aria-hidden="true" />
            </Button>
          </div>
        ))}
      </div>

      <Button variant="secondary" onClick={addQuestion}>
        <AddIcon size={16} aria-hidden="true" /> Add question
      </Button>

      <div className={styles.footer}>
        <p className={styles.totalPoints}>
          Total: {computeTotalPoints(questions)} {computeTotalPoints(questions) === 1 ? "point" : "points"}
        </p>
        <div className={styles.footerActions}>
          {error && <p className={styles.errorBanner}>{error}</p>}
          {status === "saved" && <p className={styles.savedNote}>Saved.</p>}
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
          <Button onClick={handleSave} loading={status === "saving"}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
