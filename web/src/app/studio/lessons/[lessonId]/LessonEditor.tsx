"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/design-system/primitives/Button";
import { ChipSelect } from "@/design-system/primitives/ChipSelect";
import type { LessonDetail } from "@/lib/teacher-lessons/get-lesson";
import type { LessonStatus } from "@/lib/teacher-lessons/lesson-plan-validation";
import type { ChapterGroup } from "@/lib/progress/progress-aggregation";
import styles from "./page.module.css";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
];

const NO_CONCEPT = "";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function LessonEditor({
  lesson,
  classes,
  chapters,
}: {
  lesson: LessonDetail;
  classes: { id: string; name: string }[];
  chapters: ChapterGroup[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(lesson.title);
  const [classId, setClassId] = useState(lesson.classId);
  const [conceptId, setConceptId] = useState(lesson.conceptId ?? NO_CONCEPT);
  const [grade, setGrade] = useState(lesson.grade?.toString() ?? "");
  const [subject, setSubject] = useState(lesson.subject ?? "");
  const [status, setStatus] = useState<LessonStatus[]>([lesson.status]);
  const [objectives, setObjectives] = useState(lesson.objectives);
  const [materials, setMaterials] = useState(lesson.materials);
  const [procedure, setProcedure] = useState(lesson.procedure);
  const [notes, setNotes] = useState(lesson.notes);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaveStatus("saving");
    setError(null);

    const res = await fetch(`/api/teacher/lessons/${lesson.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        classId,
        conceptId: conceptId || null,
        grade: grade === "" ? null : Number(grade),
        subject: subject || null,
        status: status[0],
        objectives,
        materials,
        procedure,
        notes,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Couldn't save. Please try again.");
      setSaveStatus("error");
      return;
    }

    setSaveStatus("saved");
    router.refresh();
  }

  async function handleDelete() {
    if (!window.confirm("Delete this lesson plan? This can't be undone.")) return;
    const res = await fetch(`/api/teacher/lessons/${lesson.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/studio/lessons");
      router.refresh();
    }
  }

  return (
    <div className={styles.editor}>
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lesson title" className={styles.titleInput} />

      <div className={styles.metaGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Class</span>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className={styles.select}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Grade</span>
          <input type="number" value={grade} onChange={(e) => setGrade(e.target.value)} className={styles.input} placeholder="Optional" />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Subject</span>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className={styles.input} placeholder="Optional" />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Concept</span>
          <select value={conceptId} onChange={(e) => setConceptId(e.target.value)} className={styles.select}>
            <option value={NO_CONCEPT}>No concept linked</option>
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
        </label>
      </div>

      <div className={styles.field}>
        <span className={styles.fieldLabel}>Status</span>
        <ChipSelect
          options={STATUS_OPTIONS}
          value={status}
          onChange={(value) => setStatus(value as LessonStatus[])}
          aria-label="Status"
        />
      </div>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Objectives</span>
        <textarea value={objectives} onChange={(e) => setObjectives(e.target.value)} className={styles.textarea} rows={3} />
      </label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Materials</span>
        <textarea value={materials} onChange={(e) => setMaterials(e.target.value)} className={styles.textarea} rows={3} />
      </label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Procedure</span>
        <textarea value={procedure} onChange={(e) => setProcedure(e.target.value)} className={styles.textarea} rows={5} />
      </label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Notes</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={styles.textarea} rows={3} />
      </label>

      <div className={styles.footer}>
        {error && <p className={styles.errorBanner}>{error}</p>}
        {saveStatus === "saved" && <p className={styles.savedNote}>Saved.</p>}
        <Button variant="danger" onClick={handleDelete}>
          Delete
        </Button>
        <Button onClick={handleSave} loading={saveStatus === "saving"}>
          Save
        </Button>
      </div>
    </div>
  );
}
