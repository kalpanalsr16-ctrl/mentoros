"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/design-system/primitives/Badge";
import type { RoadmapChapter, RoadmapNodeStatus } from "@/lib/roadmap/roadmap-aggregation";
import styles from "./ConceptPicker.module.css";

const STATUS_LABEL: Record<RoadmapNodeStatus, string> = {
  done: "Mastered",
  current: "In progress",
  next: "Not started",
};

const STATUS_VARIANT: Record<RoadmapNodeStatus, "success" | "brand" | "neutral"> = {
  done: "success",
  current: "brand",
  next: "neutral",
};

type ConceptPickerProps =
  | { chapters: RoadmapChapter[]; activeConceptId: string | null; degradedConceptNames?: never }
  | { degradedConceptNames: string[]; activeConceptId: string | null; chapters?: never };

/**
 * Reuses the real roadmap graph (same data web/src/app/app/roadmap
 * already reads) as AI Tutor's concept picker -- every status badge
 * reflects this student's actual learner_concept_mastery, never a
 * placeholder. The degraded fallback (roadmap_aggregation's own cycle
 * guard) only has plain names, no ids -- rendered as plain text, not a
 * fake clickable list, same honesty rule Learning Roadmap's own degraded
 * state already follows.
 */
export function ConceptPicker(props: ConceptPickerProps) {
  const router = useRouter();

  if (props.degradedConceptNames) {
    return (
      <ul className={styles.degradedList}>
        {props.degradedConceptNames.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    );
  }

  return (
    <div className={styles.chapters}>
      {props.chapters.map((chapter) => (
        <div key={chapter.chapterId} className={styles.chapter}>
          <p className={styles.chapterTitle}>{chapter.chapterTitle}</p>
          <div className={styles.conceptList}>
            {chapter.nodes.map((node) => (
              <button
                key={node.conceptId}
                type="button"
                className={`${styles.conceptRow} ${node.conceptId === props.activeConceptId ? styles.active : ""}`}
                onClick={() => router.push(`/tutor?concept=${node.conceptId}`)}
              >
                <span className={styles.conceptName}>{node.conceptName}</span>
                <Badge variant={STATUS_VARIANT[node.status]}>{STATUS_LABEL[node.status]}</Badge>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
