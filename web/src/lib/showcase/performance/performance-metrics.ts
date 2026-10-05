import { estimateCostForModel, priceFor } from "@/lib/llm/pricing";

/**
 * Pure aggregation over the per-event measurements returned by
 * showcase_performance_rows(). Every figure carries its sample size. Nothing
 * here reads student identifiers, payload text, or model output.
 */

export type Traffic = "benchmark" | "tutor_auto" | "other";

export type PerfRow = {
  traceId: string;
  eventName: string;
  createdAt: string;
  traffic: Traffic;
  model: string | null;
  latencyMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  wallClockMs: number | null;
  modality: string | null;
  voiceQuestionToTranscriptMs: number | null;
  voiceTranscriptToReplyMs: number | null;
  voiceReplyToAudioMs: number | null;
  voiceTotalMs: number | null;
  avatarStatus: string | null;
};

/** Sample-size policy from docs/PHASE_E_ARCHITECTURE_PERFORMANCE.md section 7. */
export const MEDIAN_MIN_N = 30;
export const P90_MIN_N = 50;

export type SampleStats = {
  n: number;
  min: number | null;
  max: number | null;
  /** Shown only at n >= MEDIAN_MIN_N. */
  median: number | null;
  /** Shown only at n >= P90_MIN_N. */
  p90: number | null;
};

export function sampleStats(values: number[]): SampleStats {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return { n: 0, min: null, max: null, median: null, p90: null };
  return {
    n,
    min: sorted[0],
    max: sorted[n - 1],
    median: n >= MEDIAN_MIN_N ? nearestRank(sorted, 0.5) : null,
    p90: n >= P90_MIN_N ? nearestRank(sorted, 0.9) : null,
  };
}

function nearestRank(sorted: number[], q: number): number {
  return sorted[Math.ceil(q * sorted.length) - 1];
}

const TERMINAL_EVENTS = ["reply_sent", "safety_reply_sent", "reply_failed", "turn_cancelled"];

/** Rows that belong to ordinary (non-benchmark, non-tutor-auto) traffic. Every student-facing metric uses only these. */
function ordinary(rows: PerfRow[]): PerfRow[] {
  return rows.filter((r) => r.traffic === "other");
}

export function trafficCounts(rows: PerfRow[]) {
  const terminal = rows.filter((r) => TERMINAL_EVENTS.includes(r.eventName));
  const traceIds = (list: PerfRow[]) => new Set(list.map((r) => r.traceId)).size;
  return {
    ordinaryTurns: ordinary(terminal).length,
    tutorAutoTurns: terminal.filter((r) => r.traffic === "tutor_auto").length,
    benchmarkTraces: traceIds(rows.filter((r) => r.traffic === "benchmark")),
    rowsRead: rows.length,
  };
}

export type StageKey = "safety" | "router" | "planning" | "teaching" | "reflection" | "evaluation";

type StageDef = { key: string; label: string; events: string[]; core: boolean; llm: boolean };

export const STAGES: StageDef[] = [
  { key: "safety", label: "Safety", events: ["message_received", "safety_blocked"], core: true, llm: true },
  { key: "router", label: "Router", events: ["intent_detected"], core: true, llm: true },
  { key: "planning", label: "Planning", events: ["learning_plan_created"], core: true, llm: false },
  { key: "concept", label: "Teaching: Concept", events: ["concept_explained"], core: true, llm: true },
  { key: "practice", label: "Teaching: Practice", events: ["practice_generated"], core: true, llm: true },
  { key: "assessment", label: "Teaching: Assessment", events: ["assessment_completed"], core: true, llm: true },
  { key: "general", label: "General reply (unguided)", events: ["llm_call_succeeded"], core: true, llm: true },
  { key: "reflection", label: "Reflection", events: ["reflection_completed"], core: true, llm: true },
  { key: "evaluation", label: "Evaluation", events: ["evaluation_completed"], core: true, llm: true },
  { key: "stt", label: "Speech-to-text (Meta Muse)", events: ["voice_transcription_completed"], core: false, llm: false },
];

const stageOf = (eventName: string): StageDef | undefined => STAGES.find((s) => s.events.includes(eventName));

export function latencyByStage(rows: PerfRow[]) {
  const ord = ordinary(rows);
  return STAGES.map((stage) => ({
    key: stage.key,
    label: stage.label,
    stats: sampleStats(
      ord.filter((r) => stage.events.includes(r.eventName) && r.latencyMs !== null).map((r) => r.latencyMs as number),
    ),
  }));
}

export function wallClock(rows: PerfRow[]) {
  const ord = ordinary(rows).filter((r) => TERMINAL_EVENTS.includes(r.eventName));
  const measured = ord.filter((r) => r.wallClockMs !== null);
  return {
    stats: sampleStats(measured.map((r) => r.wallClockMs as number)),
    observed: measured.map((r) => r.wallClockMs as number),
    unmeasuredTurns: ord.length - measured.length,
  };
}

/** Share of measured core-stage time, across ordinary turns. Not a waterfall: no start times, no sequencing implied. */
export function composition(rows: PerfRow[]) {
  const ord = ordinary(rows);
  const totals = new Map<string, { label: string; sum: number; n: number }>();
  for (const stage of STAGES.filter((s) => s.core)) {
    const matching = ord.filter((r) => stage.events.includes(r.eventName) && r.latencyMs !== null);
    if (matching.length === 0) continue;
    totals.set(stage.key, {
      label: stage.label,
      sum: matching.reduce((acc, r) => acc + (r.latencyMs as number), 0),
      n: matching.length,
    });
  }
  const grand = [...totals.values()].reduce((acc, t) => acc + t.sum, 0);
  return [...totals.entries()].map(([key, t]) => ({
    key,
    label: t.label,
    n: t.n,
    share: grand > 0 ? t.sum / grand : 0,
  }));
}

/** ESTIMATED cost: token counts from the provider, priced with the application's pricing constants. */
export const COST_BASIS = "estimated from provider token counts and application pricing constants; not provider billing";

export function economics(rows: PerfRow[]) {
  const llmRows = ordinary(rows).filter((r) => {
    const stage = stageOf(r.eventName);
    return stage?.llm && r.model !== null && r.inputTokens !== null && r.outputTokens !== null;
  });

  const byStage = STAGES.filter((s) => s.llm).map((stage) => {
    const matching = llmRows.filter((r) => stage.events.includes(r.eventName));
    const priced = matching.filter((r) => priceFor(r.model as string) !== null);
    const input = matching.reduce((acc, r) => acc + (r.inputTokens as number), 0);
    const output = matching.reduce((acc, r) => acc + (r.outputTokens as number), 0);
    const cost = priced.reduce(
      (acc, r) => acc + (estimateCostForModel(r.model as string, r.inputTokens as number, r.outputTokens as number) ?? 0),
      0,
    );
    return {
      key: stage.key,
      label: stage.label,
      calls: matching.length,
      meanInputTokens: matching.length ? input / matching.length : null,
      meanOutputTokens: matching.length ? output / matching.length : null,
      totalTokens: input + output,
      estimatedCostUsd: priced.length ? cost : null,
      unpricedCalls: matching.length - priced.length,
    };
  });

  const models = [...new Set(llmRows.map((r) => r.model as string))].map((model) => {
    const matching = llmRows.filter((r) => r.model === model);
    const input = matching.reduce((acc, r) => acc + (r.inputTokens as number), 0);
    const output = matching.reduce((acc, r) => acc + (r.outputTokens as number), 0);
    const priced = priceFor(model) !== null;
    return {
      model,
      calls: matching.length,
      inputTokens: input,
      outputTokens: output,
      totalTokens: input + output,
      estimatedCostUsd: priced ? estimateCostForModel(model, input, output) : null,
      priced,
    };
  });

  // Per turn: only turns whose every LLM call is priced get a cost, so an unknown model never lowers the average.
  const byTrace = new Map<string, PerfRow[]>();
  for (const r of llmRows) {
    const list = byTrace.get(r.traceId) ?? [];
    list.push(r);
    byTrace.set(r.traceId, list);
  }
  const turnCosts: number[] = [];
  for (const calls of byTrace.values()) {
    if (calls.every((r) => priceFor(r.model as string) !== null)) {
      turnCosts.push(
        calls.reduce(
          (acc, r) => acc + (estimateCostForModel(r.model as string, r.inputTokens as number, r.outputTokens as number) ?? 0),
          0,
        ),
      );
    }
  }

  return {
    costBasis: COST_BASIS,
    byStage,
    models,
    perTurn: sampleStats(turnCosts),
    unpricedCalls: llmRows.filter((r) => priceFor(r.model as string) === null).length,
  };
}

export function voice(rows: PerfRow[]) {
  const ord = ordinary(rows);
  const timings = ord.filter((r) => r.eventName === "voice_turn_timing");
  const segment = (pick: (r: PerfRow) => number | null) =>
    sampleStats(timings.map(pick).filter((v): v is number => v !== null));
  const avatarStatuses: Record<string, number> = {};
  for (const r of timings) {
    const status = r.avatarStatus ?? "unknown";
    avatarStatuses[status] = (avatarStatuses[status] ?? 0) + 1;
  }
  return {
    questionToTranscript: segment((r) => r.voiceQuestionToTranscriptMs),
    transcriptToReply: segment((r) => r.voiceTranscriptToReplyMs),
    replyToFirstAudio: segment((r) => r.voiceReplyToAudioMs),
    totalToFirstAudio: segment((r) => r.voiceTotalMs),
    transcription: sampleStats(
      ord.filter((r) => r.eventName === "voice_transcription_completed" && r.latencyMs !== null).map((r) => r.latencyMs as number),
    ),
    avatarStatuses,
  };
}

/** Compares a turn's measured core-stage sum for typed versus spoken turns. Traces with no modality are excluded. */
export function textVsVoiceStageSum(rows: PerfRow[]) {
  const ord = ordinary(rows);
  const modalityByTrace = new Map<string, string>();
  for (const r of ord) {
    if (TERMINAL_EVENTS.includes(r.eventName) && r.modality) modalityByTrace.set(r.traceId, r.modality);
  }
  const sums = new Map<string, number>();
  for (const r of ord) {
    const stage = stageOf(r.eventName);
    if (!stage?.core || r.latencyMs === null) continue;
    sums.set(r.traceId, (sums.get(r.traceId) ?? 0) + r.latencyMs);
  }
  const collect = (modality: string) =>
    sampleStats([...sums.entries()].filter(([trace]) => modalityByTrace.get(trace) === modality).map(([, sum]) => sum));
  return { text: collect("text"), voice: collect("voice") };
}

export function reliability(rows: PerfRow[]) {
  const ord = ordinary(rows);
  const count = (names: string[]) => ord.filter((r) => names.includes(r.eventName)).length;
  return {
    completed: count(["reply_sent", "safety_reply_sent"]),
    errored: count(["reply_failed"]),
    cancelled: count(["turn_cancelled"]),
    llmCallFailures: count(["llm_call_failed"]),
    evaluationFailures: count(["evaluation_failed"]),
    planningFailures: count(["planning_failed"]),
    transcriptionFailures: count(["voice_transcription_failed"]),
  };
}

export type Interpretation = { text: string; basis: string };

/**
 * Conclusions are emitted only when the measured data meets the sample policy.
 * Each carries the figures that support it, so measurement and interpretation stay separate.
 */
export function interpretations(rows: PerfRow[]): Interpretation[] {
  const out: Interpretation[] = [];
  const ord = ordinary(rows);
  const byTrace = new Map<string, PerfRow[]>();
  for (const r of ord) {
    const stage = stageOf(r.eventName);
    if (!stage?.core || r.latencyMs === null) continue;
    byTrace.set(r.traceId, [...(byTrace.get(r.traceId) ?? []), r]);
  }
  const conceptTurns = [...byTrace.values()].filter((calls) => calls.some((c) => c.eventName === "concept_explained"));
  const conceptLongest = conceptTurns.filter((calls) => {
    const concept = calls.find((c) => c.eventName === "concept_explained")!;
    return calls.every((c) => c === concept || (c.latencyMs as number) < (concept.latencyMs as number));
  }).length;
  if (conceptTurns.length >= MEDIAN_MIN_N && conceptLongest / conceptTurns.length > 0.5) {
    out.push({
      text: "On turns that reach the Concept call, that call is the longest measured stage.",
      basis: `true in ${conceptLongest} of ${conceptTurns.length} such turns (n=${conceptTurns.length})`,
    });
  }
  const v = voice(rows);
  if (v.transcriptToReply.n >= MEDIAN_MIN_N && v.replyToFirstAudio.n >= MEDIAN_MIN_N &&
      v.transcriptToReply.median !== null && v.replyToFirstAudio.median !== null &&
      v.transcriptToReply.median > v.replyToFirstAudio.median) {
    out.push({
      text: "In measured voice turns, the time from transcript to reply is longer than the time from reply to first avatar audio.",
      basis: `median ${Math.round(v.transcriptToReply.median)} ms vs ${Math.round(v.replyToFirstAudio.median)} ms; n=${v.transcriptToReply.n}`,
    });
  }
  return out;
}
