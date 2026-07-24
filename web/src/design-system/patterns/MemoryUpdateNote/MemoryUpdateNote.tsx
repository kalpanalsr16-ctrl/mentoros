"use client";

import { useState } from "react";
import { CloseIcon } from "@/design-system/icons";
import type { MasteryUpdatePayload } from "@/lib/chat/types";
import styles from "./MemoryUpdateNote.module.css";

export type MemoryUpdateNoteProps = {
  update: MasteryUpdatePayload;
};

/**
 * Memory Agent's update, surfaced quietly (docs/ui-architecture/
 * 05_Chat_Experience.md's "Memory updates" section) -- caption type,
 * `success` accent used sparingly, dismissible, never a popup or
 * blocking element. Only rendered when a real mastery change happened
 * (route.ts only includes `masteryUpdate` on turns where Memory Agent
 * actually applied evidence).
 */
export function MemoryUpdateNote({ update }: MemoryUpdateNoteProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <span className={styles.note}>
      Your mastery in {update.conceptName} is now {update.masteryScore}%
      <button
        type="button"
        className={styles.dismiss}
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <CloseIcon size={12} aria-hidden="true" />
      </button>
    </span>
  );
}
