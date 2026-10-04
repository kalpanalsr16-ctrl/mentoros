const WORDS_PER_SECOND = 2.6;
const MIN_SENTENCE_MS = 600;

/** Rough speaking time for one sentence. Used only to move the highlight, never reported as measured speech. */
export function estimatedSentenceMs(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(MIN_SENTENCE_MS, (words / WORDS_PER_SECOND) * 1000);
}

/** Which sentence the estimate says is being spoken, given cumulative durations from the first sentence. */
export function activeSentenceIndex(durationsMs: number[], elapsedMs: number): number | null {
  if (durationsMs.length === 0 || elapsedMs < 0) return null;
  let start = 0;
  for (let i = 0; i < durationsMs.length; i++) {
    if (elapsedMs < start + durationsMs[i]) return i;
    start += durationsMs[i];
  }
  return durationsMs.length - 1;
}
