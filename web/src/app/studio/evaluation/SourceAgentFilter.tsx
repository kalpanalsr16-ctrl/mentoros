"use client";

import { useRouter } from "next/navigation";
import { ChipSelect } from "@/design-system/primitives/ChipSelect";

const ALL = "";

/** Filters by which of the three generative agents produced the evaluated response, per 06_Dashboard_Architecture.md's "source agent" filter. */
export function SourceAgentFilter({ classId, range, sourceAgent }: { classId: string; range: string; sourceAgent: string | null }) {
  const router = useRouter();

  return (
    <ChipSelect
      options={[
        { value: ALL, label: "All agents" },
        { value: "Concept", label: "Concept" },
        { value: "Practice", label: "Practice" },
        { value: "Assessment", label: "Assessment" },
      ]}
      value={[sourceAgent ?? ALL]}
      onChange={([value]) => {
        const params = new URLSearchParams({ classId, range, ...(value ? { sourceAgent: value } : {}) });
        router.push(`/studio/evaluation?${params.toString()}`);
      }}
      aria-label="Filter by source agent"
    />
  );
}
