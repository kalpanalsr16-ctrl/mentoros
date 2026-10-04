"use client";

import { DrPawsFace } from "./DrPawsFace";
import styles from "./DrPawsInvite.module.css";

/** Right-edge invitation to talk to Dr. Paws. Opening it takes over half the screen. */
export function DrPawsInvite({ onOpen }: { onOpen: () => void }) {
  return (
    <button type="button" className={styles.invite} onClick={onOpen} aria-label="Talk to Dr. Paws">
      <span className={styles.badge}>NEW</span>
      <DrPawsFace size={56} className={styles.face} />
      <span className={styles.label}>Talk to Dr. Paws</span>
    </button>
  );
}
