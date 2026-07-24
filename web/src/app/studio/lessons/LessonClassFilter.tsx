"use client";

import { useRouter } from "next/navigation";
import { ChipSelect } from "@/design-system/primitives/ChipSelect";

const ALL_CLASSES = "";

/**
 * Read-only filter, same navigate-not-fetch convention as ClassPicker
 * (Misconceptions/Analytics/Interventions) -- not reused directly since
 * this list defaults to showing every class's lessons at once (no
 * required selection), which ClassPicker's props don't support.
 */
export function LessonClassFilter({ classes, selectedClassId }: { classes: { id: string; name: string }[]; selectedClassId: string }) {
  const router = useRouter();

  return (
    <ChipSelect
      options={[{ value: ALL_CLASSES, label: "All classes" }, ...classes.map((c) => ({ value: c.id, label: c.name }))]}
      value={[selectedClassId]}
      onChange={([classId]) => router.push(classId ? `/studio/lessons?classId=${classId}` : "/studio/lessons")}
      aria-label="Filter by class"
    />
  );
}
