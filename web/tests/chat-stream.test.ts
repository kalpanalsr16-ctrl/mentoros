import { test } from "node:test";
import assert from "node:assert/strict";
import { createStreamingEventBuilder } from "@/lib/chat/streaming-event-builder";
import { parseChatStream } from "@/lib/chat/parse-chat-stream";
import type { ChatStreamEvent, ChatStreamDonePayload } from "@/lib/chat/types";

const SAMPLE_DONE: ChatStreamDonePayload = {
  conversationId: "conv-1",
  userMessage: { id: "u1", role: "user", content: "Hi", trace_id: null },
  assistantMessage: { id: "a1", role: "assistant", content: "Hello!", trace_id: "trace-1" },
  traceId: "trace-1",
  replyKind: "text",
};

async function collect(stream: ReadableStream<Uint8Array>): Promise<ChatStreamEvent[]> {
  const events: ChatStreamEvent[] = [];
  for await (const event of parseChatStream(stream)) {
    events.push(event);
  }
  return events;
}

test("StreamingEventBuilder + parseChatStream round-trip a full turn", async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const events = createStreamingEventBuilder(controller);
      events.state("Thinking");
      events.state("Teaching");
      events.chunk("Hello");
      events.chunk(" world");
      events.state("Completed");
      events.done(SAMPLE_DONE);
      events.close();
    },
  });

  const received = await collect(stream);

  assert.deepEqual(received, [
    { type: "state", state: "Thinking" },
    { type: "state", state: "Teaching" },
    { type: "chunk", text: "Hello" },
    { type: "chunk", text: " world" },
    { type: "state", state: "Completed" },
    { type: "done", payload: SAMPLE_DONE },
  ]);
});

test("a turn with no chunk events (structured reply) still ends in done", async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const events = createStreamingEventBuilder(controller);
      events.state("Thinking");
      events.state("Teaching");
      events.done({ ...SAMPLE_DONE, replyKind: "practice" });
      events.close();
    },
  });

  const received = await collect(stream);
  assert.equal(received.length, 3);
  assert.equal(received[2].type, "done");
});

test("parseChatStream reassembles an SSE frame split across two reads", async () => {
  const encoder = new TextEncoder();
  const full = `event: chunk\ndata: ${JSON.stringify({ type: "chunk", text: "partial" })}\n\n`;
  const splitPoint = Math.floor(full.length / 2);
  const bytes = encoder.encode(full);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes.slice(0, splitPoint));
      controller.enqueue(bytes.slice(splitPoint));
      controller.close();
    },
  });

  const received = await collect(stream);
  assert.deepEqual(received, [{ type: "chunk", text: "partial" }]);
});

test("error events surface with their message", async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const events = createStreamingEventBuilder(controller);
      events.error("Could not save the reply.");
      events.close();
    },
  });

  const received = await collect(stream);
  assert.deepEqual(received, [{ type: "error", message: "Could not save the reply." }]);
});
