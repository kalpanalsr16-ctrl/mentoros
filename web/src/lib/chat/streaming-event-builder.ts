import type { ChatStreamEvent, ChatStreamDonePayload, StreamingUserState } from "@/lib/chat/types";

/**
 * Owns the wire format for `/api/chat`'s streaming response, so route.ts
 * never hand-formats an SSE string -- it just calls `events.state(...)`,
 * `events.chunk(...)`, `events.done(...)` and stays focused on pipeline
 * orchestration. Adding a new event type (the `ChatStreamEvent` union in
 * lib/chat/types.ts) means adding one method here, not touching every
 * call site in route.ts that emits progress.
 */
export function createStreamingEventBuilder(controller: ReadableStreamDefaultController<Uint8Array>) {
  const encoder = new TextEncoder();

  function write(event: ChatStreamEvent): void {
    controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));
  }

  return {
    state(state: StreamingUserState): void {
      write({ type: "state", state });
    },
    chunk(text: string): void {
      write({ type: "chunk", text });
    },
    done(payload: ChatStreamDonePayload): void {
      write({ type: "done", payload });
    },
    error(message: string): void {
      write({ type: "error", message });
    },
    close(): void {
      controller.close();
    },
  };
}

export type StreamingEventBuilder = ReturnType<typeof createStreamingEventBuilder>;
