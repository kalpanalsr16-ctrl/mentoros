"use client";

import styles from "./QuickActions.module.css";

export type QuickAction = { label: string; starter: string };

/**
 * Ask Mentor's quick-action row (learner UI redesign): each button just
 * prefills the welcome input with a starter phrase for the student to
 * finish and send themselves -- there's no concept chosen yet, so
 * auto-sending a vague message would just produce a generic reply. This
 * routes through the exact same /api/chat pipeline as typing from
 * scratch; nothing new on the backend.
 */
export const QUICK_ACTIONS: QuickAction[] = [
  { label: "Explain a concept", starter: "Can you explain " },
  { label: "Help me solve", starter: "Can you help me solve " },
  { label: "Practice", starter: "Give me a practice problem on " },
  { label: "Test me", starter: "Test me on " },
];

export function QuickActions({ onSelect }: { onSelect: (starter: string) => void }) {
  return (
    <div className={styles.row} role="group" aria-label="Quick actions">
      {QUICK_ACTIONS.map((action) => (
        <button key={action.label} type="button" className={styles.chip} onClick={() => onSelect(action.starter)}>
          {action.label}
        </button>
      ))}
    </div>
  );
}
