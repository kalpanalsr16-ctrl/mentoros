"use client";

import type { RefCallback } from "react";
import type { AvatarStatus } from "./useAvatarSession";
import { MathSpaceBackground } from "./MathSpaceBackground";
import { DrPawsFace } from "./DrPawsFace";
import styles from "./DrPawsStage.module.css";

const STATUS_TEXT: Record<AvatarStatus, string> = {
  idle: "",
  starting: "Dr. Paws is joining…",
  ready: "Ask your question with the mic, and Dr. Paws will explain it.",
  failed: "Dr. Paws is unavailable right now. Your text answers still work.",
};

/** Half-screen Dr. Paws stage. Replaces the chat column's left half while open. */
export function DrPawsStage({
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
    <section className={styles.stage} aria-label="Dr. Paws">
      <MathSpaceBackground />
      <div className={styles.content}>
        <div className={`${styles.frame} ${speaking ? styles.speaking : ""}`}>
          <video ref={videoRef} autoPlay playsInline className={styles.video} />
          {status !== "ready" && status !== "failed" && <div className={styles.joining}>Connecting…</div>}
        </div>
        <h2 className={styles.name}>
          <DrPawsFace size={28} /> Dr. Paws
        </h2>
        <p className={styles.status} role="status">
          {speaking ? "Dr. Paws is explaining…" : STATUS_TEXT[status]}
        </p>
        <button type="button" className={styles.endButton} onClick={onEnd}>
          {status === "failed" ? "Close" : "End session"}
        </button>
      </div>
    </section>
  );
}
