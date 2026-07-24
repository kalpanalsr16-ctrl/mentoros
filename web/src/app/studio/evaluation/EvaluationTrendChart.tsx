"use client";

import { useState } from "react";
import { ChipSelect } from "@/design-system/primitives/ChipSelect";
import { LineTrendChart } from "@/design-system/patterns/LineTrendChart";
import { EVALUATION_DIMENSIONS, type EvaluationDimension, type TrendPoint } from "@/lib/evaluation-analytics/evaluation-analytics-aggregation";
import styles from "./page.module.css";

const DIMENSION_LABELS: Record<EvaluationDimension, string> = {
  overallScore: "Overall",
  groundedness: "Groundedness",
  accuracy: "Accuracy",
  educationalQuality: "Educational quality",
  personalization: "Personalization",
  clarity: "Clarity",
  safety: "Safety",
};

/**
 * All seven dimension trends are already computed server-side from the
 * same fetched events (buildDimensionTrends computes all at once) --
 * this toggle is purely client-side, no re-fetch per dimension change.
 */
export function EvaluationTrendChart({ trends }: { trends: Record<EvaluationDimension, TrendPoint[]> }) {
  const [dimension, setDimension] = useState<EvaluationDimension>("overallScore");

  return (
    <div className={styles.trendSection}>
      <ChipSelect
        options={EVALUATION_DIMENSIONS.map((d) => ({ value: d, label: DIMENSION_LABELS[d] }))}
        value={[dimension]}
        onChange={([d]) => setDimension(d as EvaluationDimension)}
        aria-label="Select a score dimension"
      />
      <LineTrendChart
        title={`${DIMENSION_LABELS[dimension]} score`}
        points={trends[dimension].map((p) => ({ timestamp: p.date, value: p.value }))}
        formatValue={(v) => Math.round(v).toString()}
        emptyLabel="No evaluated interactions in this range."
      />
    </div>
  );
}
