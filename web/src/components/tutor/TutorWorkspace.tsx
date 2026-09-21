"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/design-system/primitives/Card";
import { Button } from "@/design-system/primitives/Button";
import { LinkButton } from "@/design-system/primitives/LinkButton";
import { MessageBubble } from "@/design-system/patterns/MessageBubble";
import { PracticeQuestionCard } from "@/design-system/patterns/PracticeQuestionCard";
import { AssessmentFeedbackCard } from "@/design-system/patterns/AssessmentFeedbackCard";
import { StreamingIndicator } from "@/design-system/patterns/StreamingIndicator";
import { TransparencyPanel } from "@/design-system/patterns/TransparencyPanel";
import { TransparencyIcon } from "@/design-system/icons";
import { parseChatStream } from "@/lib/chat/parse-chat-stream";
import type { StreamingUserState, ReplyKind } from "@/lib/chat/types";
import type { PracticeSet } from "@/lib/agents/practice-agent";
import type { AssessmentReport } from "@/lib/agents/assessment-agent";
import styles from "./TutorWorkspace.module.css";

type LessonResult = {
  content: string;
  replyKind: ReplyKind;
  practiceSet?: PracticeSet;
  assessmentReport?: AssessmentReport;
  traceId: string;
};

/**
 * AI Tutor's single-concept workspace (learner UI redesign). Not a chat
 * transcript -- one focused lesson at a time, replaced (not appended)
 * when the student asks for a different angle or practice. Deliberately
 * doesn't reuse ChatShell's sendRequest (built for a multi-message
 * transcript with retry-by-index and optimistic message list state,
 * none of which this single-response workspace needs) -- instead calls
 * the exact same /api/chat endpoint directly via parseChatStream, the
 * same reusable SSE parser ChatShell itself uses. Every explanation
 * here is a real, fresh Concept/Practice Agent turn, not retrieved from
 * history -- there's no reliable way to look up "the stored explanation
 * for concept X" from past events (concept_explained doesn't log the
 * response text, only nextStep/confidence).
 */
export function TutorWorkspace({ conceptId, conceptName }: { conceptId: string; conceptName: string }) {
  const [result, setResult] = useState<LessonResult | null>(null);
  const [streamingState, setStreamingState] = useState<StreamingUserState | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function ask(prompt: string) {
    abortRef.current?.abort();
    setError(null);
    setResult(null);
    setStreamingText("");
    setStreamingState("Preparing");

    const abortController = new AbortController();
    abortRef.current = abortController;
    let draft = "";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: prompt }),
        signal: abortController.signal,
      });

      if (!response.ok || !response.body) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error ?? "Something went wrong. Please try again.");
      }

      for await (const event of parseChatStream(response.body)) {
        if (event.type === "state") {
          setStreamingState(event.state);
        } else if (event.type === "chunk") {
          draft += event.text;
          setStreamingText(draft);
        } else if (event.type === "done") {
          setResult({
            content: event.payload.assistantMessage.content,
            replyKind: event.payload.replyKind,
            practiceSet: event.payload.practiceSet,
            assessmentReport: event.payload.assessmentReport,
            traceId: event.payload.traceId,
          });
        } else if (event.type === "error") {
          throw new Error(event.message);
        }
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    } finally {
      setStreamingState(null);
      abortRef.current = null;
    }
  }

  const askedConceptRef = useRef<string | null>(null);
  useEffect(() => {
    if (askedConceptRef.current === conceptId) return;
    askedConceptRef.current = conceptId;
    ask(`Can you explain ${conceptName}?`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conceptId]);

  const busy = streamingState !== null;

  return (
    <Card className={styles.workspace}>
      <div className={styles.headRow}>
        <div>
          <p className={styles.eyebrow}>Current concept</p>
          <h2 className={styles.conceptName}>{conceptName}</h2>
        </div>
        {result && (
          <LinkButton icon={<TransparencyIcon aria-hidden="true" />} onClick={() => setPanelOpen(true)}>
            How I taught this
          </LinkButton>
        )}
      </div>

      <div className={styles.lesson}>
        {busy && !streamingText && <StreamingIndicator state={streamingState} />}
        {busy && streamingText && <MessageBubble content={streamingText} variant="assistant" streaming />}
        {!busy && error && <p className={styles.error}>{error}</p>}
        {!busy && result && <LessonContent result={result} />}
      </div>

      <div className={styles.actions}>
        <Link href="/chat" className={styles.secondaryAction}>
          Ask Mentor
        </Link>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => ask(`I don't understand ${conceptName}. Can you explain it a different way?`)}
        >
          I don&apos;t understand
        </Button>
        <Button disabled={busy} onClick={() => ask(`Give me a practice problem on ${conceptName}.`)}>
          Practice this
        </Button>
      </div>

      {panelOpen && result && (
        <div className={styles.panelWrap}>
          <TransparencyPanel traceId={result.traceId} onClose={() => setPanelOpen(false)} />
        </div>
      )}
    </Card>
  );
}

function LessonContent({ result }: { result: LessonResult }) {
  if (result.replyKind === "practice" && result.practiceSet) {
    return <PracticeQuestionCard practiceSet={result.practiceSet} />;
  }
  if (result.replyKind === "assessment" && result.assessmentReport) {
    return <AssessmentFeedbackCard assessmentReport={result.assessmentReport} />;
  }
  return <MessageBubble content={result.content} variant={result.replyKind === "safety_decline" ? "safety" : "assistant"} />;
}
