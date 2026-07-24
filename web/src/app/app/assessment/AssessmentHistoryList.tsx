"use client";

import { useState } from "react";
import { Badge } from "@/design-system/primitives/Badge";
import { AssessmentFeedbackCard, STATUS_BADGE } from "@/design-system/patterns/AssessmentFeedbackCard";
import type { AssessmentHistoryItem } from "@/lib/assessment-history/assessment-history-aggregation";
import styles from "./page.module.css";

/**
 * Tapping a row expands it into the full AssessmentFeedbackCard
 * (misconceptions/feedback), per 02_Student_Experience.md's Assessment
 * History interaction -- collapsed by default so the reverse-chronological
 * list stays scannable, matching the same component chat renders inline
 * rather than building a second renderer for the same report shape.
 */
export function AssessmentHistoryList({ items }: { items: AssessmentHistoryItem[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className={styles.list}>
      {items.map((item) => {
        const isExpanded = expandedId === item.id;
        return (
          <div key={item.id}>
            <button
              type="button"
              className={styles.row}
              onClick={() => setExpandedId(isExpanded ? null : item.id)}
              aria-expanded={isExpanded}
            >
              <div className={styles.rowMain}>
                <p className={styles.conceptName}>{item.conceptName}</p>
                <p className={styles.rowMeta}>
                  {new Date(item.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <Badge variant={STATUS_BADGE[item.report.status]}>{item.report.status}</Badge>
            </button>

            {isExpanded && <AssessmentFeedbackCard assessmentReport={item.report} />}
          </div>
        );
      })}
    </div>
  );
}
