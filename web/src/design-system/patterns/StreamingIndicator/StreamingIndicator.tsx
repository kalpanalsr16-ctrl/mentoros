import type { StreamingUserState } from "@/lib/chat/types";
import styles from "./StreamingIndicator.module.css";

const STATE_LABEL: Record<StreamingUserState, string> = {
  Preparing: "Sending...",
  Thinking: "Thinking...",
  Teaching: "Typing...",
  Completed: "Done",
};

/**
 * The coarse, four-state model a student sees while waiting (Sprint 4) --
 * deliberately separate from the per-agent detail the AI Transparency
 * Panel shows (docs/ui-architecture/07_AI_Transparency_Panel.md remains
 * the place to inspect the real Safety/Router/Planning/... sequence).
 * "Thinking" and "Teaching" are driven by real pipeline checkpoints
 * (StreamingEventBuilder's `state` events), not a fixed decorative timer.
 */
export function StreamingIndicator({ state }: { state: StreamingUserState }) {
  return (
    <p className={styles.indicator} role="status">
      <span className={styles.dot} aria-hidden="true" />
      {STATE_LABEL[state]}
    </p>
  );
}
