"use client";

import { useRouter } from "next/navigation";
import { ChipSelect } from "@/design-system/primitives/ChipSelect";

/**
 * Shared by Misconception Reports (G10) and Progress Analytics (G11) --
 * both are class-scoped screens reached via `?classId=` rather than a
 * dynamic route segment. Navigates rather than client-side fetching --
 * the page itself stays a Server Component reading searchParams,
 * matching this app's SSR-first data convention. `extraParams` lets a
 * caller preserve other query state (e.g. Progress Analytics' `range`)
 * across a class switch.
 */
export function ClassPicker({
  classes,
  selectedClassId,
  basePath,
  extraParams,
}: {
  classes: { id: string; name: string }[];
  selectedClassId: string;
  basePath: string;
  extraParams?: Record<string, string>;
}) {
  const router = useRouter();

  return (
    <ChipSelect
      options={classes.map((c) => ({ value: c.id, label: c.name }))}
      value={[selectedClassId]}
      onChange={([classId]) => {
        const params = new URLSearchParams({ classId, ...extraParams });
        router.push(`${basePath}?${params.toString()}`);
      }}
      aria-label="Select a class"
    />
  );
}
