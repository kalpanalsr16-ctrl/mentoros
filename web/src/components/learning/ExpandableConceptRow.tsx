"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, type BadgeVariant } from "@/design-system/primitives/Badge";
import { ChevronDownIcon } from "@/design-system/icons";
import type { ConceptStatus } from "@/lib/learning-overview/learning-overview-aggregation";
import styles from "./ExpandableConceptRow.module.css";

const STATUS_LABEL: Record<ConceptStatus, string> = {
  new: "New",
  learning: "Learning",
  mastered: "Mastered",
  struggling: "Needs work",
};

const STATUS_VARIANT: Record<ConceptStatus, BadgeVariant> = {
  new: "neutral",
  learning: "brand",
  mastered: "success",
  struggling: "warning",
};

export type ExpandableConceptRowProps = {
  conceptId: string;
  conceptName: string;
  status: ConceptStatus;
  masteryScore: number;
  retentionScore: number | null;
  reasoning: string;
};

/**
 * A single concept row in "Your Knowledge Map" -- collapsed to just a
 * name + status badge so the map scans in seconds (the two underlying
 * percentages used to sit inline here, which read more like a
 * spreadsheet row than a learning companion). Click to reveal both
 * numbers, clearly labeled and distinguished, plus "Why MentorOS thinks
 * this" (the real, already-computed reasoning string from
 * learning-overview-aggregation.ts), without leaving the page. "View
 * full history" still links to the existing per-concept detail page for
 * the deeper assessment/practice timeline, rather than duplicating that
 * view here.
 */
export function ExpandableConceptRow({ conceptId, conceptName, status, masteryScore, retentionScore, reasoning }: ExpandableConceptRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={styles.row}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className={styles.name}>{conceptName}</span>
        <span className={styles.stats}>
          <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
          <ChevronDownIcon size={16} aria-hidden="true" className={expanded ? styles.chevronOpen : styles.chevron} />
        </span>
      </button>
      {expanded && (
        <div className={styles.detail}>
          {status !== "new" && (
            <div className={styles.detailStats}>
              <span className={styles.detailStat}>
                <span className={styles.detailStatValue}>{masteryScore}%</span> understanding
              </span>
              {retentionScore !== null && (
                <span className={styles.detailStat}>
                  <span className={styles.detailStatValue}>{retentionScore}%</span> retention
                </span>
              )}
            </div>
          )}
          <p className={styles.reasoningLabel}>Why MentorOS thinks this</p>
          <p className={styles.reasoning}>{reasoning}</p>
          <Link href={`/learning/${conceptId}`} className={styles.historyLink}>
            View full history &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}
