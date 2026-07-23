"use client";

import { useState } from "react";
import { Button } from "@/design-system/primitives/Button";
import { ChipSelect } from "@/design-system/primitives/ChipSelect";
import { PracticeQuestionCard } from "@/design-system/patterns/PracticeQuestionCard";
import { PrintIcon } from "@/design-system/icons";
import type { ChapterGroup } from "@/lib/progress/progress-aggregation";
import type { PracticeSet } from "@/lib/agents/practice-agent";
import styles from "./page.module.css";

const DIFFICULTY_OPTIONS = [
  { value: "Beginner", label: "Beginner" },
  { value: "Easy", label: "Easy" },
  { value: "Medium", label: "Medium" },
  { value: "Advanced", label: "Advanced" },
  { value: "Challenge", label: "Challenge" },
];

export function HomeworkForm({
  chapters,
  studentId,
  classId,
  initialConceptId,
}: {
  chapters: ChapterGroup[];
  studentId?: string;
  classId?: string;
  initialConceptId?: string;
}) {
  const allConceptIds = chapters.flatMap((c) => c.concepts.map((concept) => concept.conceptId));
  const defaultConceptId = initialConceptId && allConceptIds.includes(initialConceptId) ? initialConceptId : (chapters[0]?.concepts[0]?.conceptId ?? "");
  const [conceptId, setConceptId] = useState(defaultConceptId);
  const [difficulty, setDifficulty] = useState<string[]>(["Medium"]);
  const [status, setStatus] = useState<"idle" | "generating" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PracticeSet | null>(null);

  async function handleGenerate() {
    setStatus("generating");
    setError(null);
    setResult(null);

    const res = await fetch("/api/teacher/homework", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conceptId, difficulty: difficulty[0], studentId, classId }),
    });
    const body = await res.json().catch(() => null);

    if (!res.ok) {
      setStatus("error");
      setError(body?.error ?? "Couldn't generate homework right now.");
      return;
    }

    setStatus("idle");
    setResult(body as PracticeSet);
  }

  return (
    <div className={styles.form}>
      <section className={styles.field}>
        <h2 className={styles.fieldLabel}>Concept</h2>
        <select value={conceptId} onChange={(e) => setConceptId(e.target.value)} className={styles.select}>
          {chapters.map((chapter) => (
            <optgroup key={chapter.chapterId} label={chapter.chapterTitle}>
              {chapter.concepts.map((concept) => (
                <option key={concept.conceptId} value={concept.conceptId}>
                  {concept.conceptName}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </section>

      <section className={styles.field}>
        <h2 className={styles.fieldLabel}>Difficulty</h2>
        <ChipSelect options={DIFFICULTY_OPTIONS} value={difficulty} onChange={setDifficulty} aria-label="Difficulty" />
      </section>

      {status === "error" && <p className={styles.errorBanner}>{error}</p>}

      <Button type="button" onClick={handleGenerate} loading={status === "generating"} disabled={!conceptId}>
        Generate
      </Button>

      {result && (
        <div className={styles.result}>
          <PracticeQuestionCard practiceSet={result} />
          <Button type="button" variant="secondary" onClick={() => window.print()}>
            <PrintIcon size={16} aria-hidden="true" /> Print
          </Button>
        </div>
      )}
    </div>
  );
}
