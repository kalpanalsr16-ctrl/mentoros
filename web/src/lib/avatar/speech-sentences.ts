/**
 * Splits an answer into sentences the same way whether the text arrives all
 * at once or streamed in pieces. Paragraph breaks and sentence-ending
 * punctuation followed by whitespace are boundaries. A number like 0.75 is not.
 */
const BOUNDARY = /[.!?]["')\]]?\s+|\n\s*\n/g;

export function takeCompleteSentences(buffer: string): { sentences: string[]; rest: string } {
  const sentences: string[] = [];
  let last = 0;
  for (const match of buffer.matchAll(BOUNDARY)) {
    const end = (match.index ?? 0) + match[0].length;
    const sentence = buffer.slice(last, end).trim();
    if (sentence) sentences.push(sentence);
    last = end;
  }
  return { sentences, rest: buffer.slice(last) };
}

/**
 * Releases each sentence only once the next one has started, so the final
 * sentence can be marked as the end of the utterance when the reply completes.
 */
export function createSpeechStreamer() {
  let rest = "";
  let held: string[] = [];

  return {
    push(chunk: string): string[] {
      const taken = takeCompleteSentences(rest + chunk);
      rest = taken.rest;
      held = [...held, ...taken.sentences];
      const release = held.slice(0, -1);
      held = held.slice(-1);
      return release;
    },
    flush(): string[] {
      const tail = rest.trim();
      rest = "";
      const remaining = tail ? [...held, tail] : held;
      held = [];
      return remaining;
    },
  };
}

/** Every sentence of a finished answer, with the paragraph it belongs to. */
export function splitSpeechSentences(content: string): { text: string; paragraph: number }[] {
  const paragraphs = content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return paragraphs.flatMap((paragraph, index) =>
    takeCompleteSentences(`${paragraph} `).sentences.map((text) => ({ text, paragraph: index })),
  );
}

export function splitParagraphs(content: string): string[] {
  return content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}
