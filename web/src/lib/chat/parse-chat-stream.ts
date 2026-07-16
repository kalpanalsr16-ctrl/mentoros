import type { ChatStreamEvent } from "@/lib/chat/types";

/**
 * The client-side mirror of StreamingEventBuilder -- an async generator so
 * ChatShell can `for await` events instead of hand-rolling reader/decoder
 * bookkeeping inline. SSE frames are separated by a blank line; a frame
 * split across two `reader.read()` chunks is buffered until the full
 * `\n\n` boundary arrives, rather than parsed partially.
 */
export async function* parseChatStream(body: ReadableStream<Uint8Array>): AsyncGenerator<ChatStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        const dataLine = frame.split("\n").find((line) => line.startsWith("data: "));
        if (dataLine) {
          try {
            yield JSON.parse(dataLine.slice("data: ".length)) as ChatStreamEvent;
          } catch {
            // Shouldn't happen (StreamingEventBuilder always writes complete
            // JSON per frame) -- skip rather than crash the whole stream.
          }
        }

        boundary = buffer.indexOf("\n\n");
      }
    }
  } finally {
    reader.releaseLock();
  }
}
