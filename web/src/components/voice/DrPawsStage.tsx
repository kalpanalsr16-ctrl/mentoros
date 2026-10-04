"use client";

import type { RefCallback } from "react";
import type { AvatarStatus } from "./useAvatarSession";
import { MathSpaceBackground } from "./MathSpaceBackground";
import { DrPawsFace } from "./DrPawsFace";
import styles from "./DrPawsStage.module.css";

const STATUS_TEXT: Record<AvatarStatus, string> = {
  idle: "Tap the mic and ask your question. Dr. Paws will explain it here.",
  starting: "Dr. Paws is joining…",
  ready: "Ask your question with the mic, and Dr. Paws will explain it.",
  failed: "Dr. Paws is unavailable right now. Your text answers still work.",
};

/** Dr. Paws stage on the left half of the chat page. Connects when the student starts recording. */
export function DrPawsStage({
  status,
  speaking,
  videoRef,
  onEnd,
  onHide,
}: {
  status: AvatarStatus;
  speaking: boolean;
  videoRef: RefCallback<HTMLVideoElement>;
  onEnd: () => void;
  onHide: () => void;
}) {
  const live = status === "ready" || status === "starting";

  return (
    <section className={styles.stage} aria-label="Dr. Paws">
      <MathSpaceBackground />
      <button type="button" className={styles.hideButton} onClick={onHide}>
        Hide
      </button>
      <div className={styles.content}>
        <div className={`${styles.frame} ${speaking ? styles.speaking : ""}`}>
          {live ? (
            <video ref={videoRef} autoPlay playsInline className={styles.video} />
          ) : (
            <div className={styles.idleFace}>
              <DrPawsFace size={120} />
            </div>
          )}
          {status === "starting" && <div className={styles.joining}>Connecting…</div>}
        </div>
        <h2 className={styles.name}>
          <DrPawsFace size={28} /> Dr. Paws
        </h2>
        <p className={styles.status} role="status">
          {speaking ? "Dr. Paws is explaining…" : STATUS_TEXT[status]}
        </p>
        {live && (
          <button type="button" className={styles.endButton} onClick={onEnd}>
            End session
          </button>
        )}
      </div>
    </section>
  );
}
