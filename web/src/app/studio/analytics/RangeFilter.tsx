"use client";

import { useRouter } from "next/navigation";
import { ChipSelect } from "@/design-system/primitives/ChipSelect";
import { VALID_RANGES, type Range } from "@/lib/progress-analytics/progress-analytics-aggregation";

const RANGE_LABELS: Record<Range, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days" };

/** Date-range filter for Progress Analytics -- same navigate-not-fetch pattern as ClassPicker, preserving the current classId across a range change. */
export function RangeFilter({ classId, selectedRange }: { classId: string; selectedRange: Range }) {
  const router = useRouter();

  return (
    <ChipSelect
      options={VALID_RANGES.map((r) => ({ value: r, label: RANGE_LABELS[r] }))}
      value={[selectedRange]}
      onChange={([range]) => router.push(`/studio/analytics?classId=${classId}&range=${range}`)}
      aria-label="Select a date range"
    />
  );
}
