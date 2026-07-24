"use client";

import { useRouter } from "next/navigation";
import { ChipSelect } from "@/design-system/primitives/ChipSelect";
import { VALID_RANGES, type Range } from "@/lib/progress-analytics/progress-analytics-aggregation";

const RANGE_LABELS: Record<Range, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days" };

/** Same navigate-not-fetch convention as Progress Analytics' RangeFilter, just pointed at /studio/evaluation. */
export function EvaluationRangeFilter({ classId, range, sourceAgent }: { classId: string; range: Range; sourceAgent: string | null }) {
  const router = useRouter();

  return (
    <ChipSelect
      options={VALID_RANGES.map((r) => ({ value: r, label: RANGE_LABELS[r] }))}
      value={[range]}
      onChange={([r]) => {
        const params = new URLSearchParams({ classId, range: r, ...(sourceAgent ? { sourceAgent } : {}) });
        router.push(`/studio/evaluation?${params.toString()}`);
      }}
      aria-label="Select a date range"
    />
  );
}
