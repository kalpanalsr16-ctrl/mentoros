"use client";

import type { RefCallback } from "react";
import type { AvatarStatus } from "./useAvatarSession";
import styles from "./AvatarPanel.module.css";

const STATUS_TEXT: Record<AvatarStatus, string> = {
  idle: "",
  starting: "Dr. Paws is joining…",
  ready: "Dr. Paws",
  failed: "Dr. Paws is unavailable. Your text answers still work.",
};

/** Compact Dr. Paws tile shown above the conversation while a voice session is open. */
export function AvatarPanel({
  status,
  speaking,
  videoRef,
  onEnd,
}: {
  status: AvatarStatus;
  speaking: boolean;
  videoRef: RefCallback<HTMLVideoElement>;
  onEnd: () => void;
}) {
  if (status === "idle") return null;

  return (
    <section className={styles.panel} aria-label="Dr. Paws">
      <div className={styles.frame}>
        <video ref={videoRef} autoPlay playsInline className={styles.video} />
        {status === "starting" && <div className={styles.placeholder} aria-hidden="true" />}
      </div>
      <div className={styles.meta}>
        <p className={styles.status} role="status">
          {STATUS_TEXT[status]}
          {status === "ready" && speaking ? " is speaking…" : ""}
        </p>
        <button type="button" className={styles.endButton} onClick={onEnd}>
          {status === "failed" ? "Dismiss" : "End Dr. Paws"}
        </button>
      </div>
    </section>
  );
}
