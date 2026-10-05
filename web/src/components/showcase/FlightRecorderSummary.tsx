import Link from "next/link";
import { formatCostUsd, formatLatencyMs } from "@/lib/observability/format";
import { timelineSegments } from "@/lib/observability/trace-timeline";
import type { TraceView } from "@/lib/observability/transparency-provider";
import styles from "./FlightRecorderSummary.module.css";

const NOT_REPORTED = "Not reported";

function ms(value: number | null): string {
  return value === null ? NOT_REPORTED : formatLatencyMs(value);
}

/** Concept, stage-duration timeline, and voice path for one trace, above the per-agent cards. */
export function FlightRecorderSummary({ view }: { view: TraceView }) {
  const { segments, unmeasured } = timelineSegments(view.nodes);
  const { concept, totalLatencyMs, totalCostUsd } = view.summary;

  return (
    <div className={styles.summary}>
      <div className={styles.row}>
        <span className={styles.label}>Curriculum concept</span>
        {concept.status === "instrumented" ? (
          <Link href={`/learning/${concept.conceptId}`} className={styles.link}>
            {concept.conceptName ?? concept.conceptId}
          </Link>
        ) : concept.status === "no_concept" ? (
          <span className={styles.muted}>No curriculum concept matched</span>
        ) : (
          <span className={styles.muted}>Not currently instrumented</span>
        )}
      </div>

      <div className={styles.row}>
        <span className={styles.label}>Total</span>
        <span>
          {ms(totalLatencyMs)} · {formatCostUsd(totalCostUsd)}
        </span>
      </div>

      {segments.length > 0 && (
        <div className={styles.timeline} role="img" aria-label="Stage duration breakdown">
          {segments.map((segment) => (
            <div
              key={segment.agent}
              className={styles.segment}
              style={{ flexGrow: segment.share }}
              title={`${segment.agent}: ${formatLatencyMs(segment.latencyMs)}`}
            >
              <span className={styles.segmentLabel}>{segment.agent}</span>
              <span className={styles.segmentValue}>{formatLatencyMs(segment.latencyMs)}</span>
            </div>
          ))}
        </div>
      )}
      {unmeasured.length > 0 && (
        <p className={styles.muted}>
          Duration not measured for {unmeasured.join(", ")}.
        </p>
      )}

      {view.voice && (
        <div className={styles.voice}>
          <p className={styles.label}>Voice path</p>
          <dl className={styles.voiceGrid}>
            <dt>Speech-to-text</dt>
            <dd>
              {view.voice.transcription
                ? `${view.voice.transcription.status === "success" ? "Transcribed" : "Failed"} · ${ms(view.voice.transcription.latencyMs)}`
                : NOT_REPORTED}
            </dd>
            <dt>Question end → transcript</dt>
            <dd>{ms(view.voice.turnTiming?.questionEndToTranscriptMs ?? null)}</dd>
            <dt>Transcript → reply</dt>
            <dd>{ms(view.voice.turnTiming?.transcriptToReplyMs ?? null)}</dd>
            <dt>Reply → avatar audio</dt>
            <dd>{ms(view.voice.turnTiming?.replyStartToAvatarAudioMs ?? null)}</dd>
            <dt>Avatar</dt>
            <dd>{view.voice.turnTiming?.avatarStatus ?? NOT_REPORTED}</dd>
          </dl>
          <p className={styles.muted}>Avatar timing is measured in the browser, not by Tavus.</p>
        </div>
      )}
    </div>
  );
}
