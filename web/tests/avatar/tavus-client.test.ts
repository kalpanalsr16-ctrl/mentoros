import { test } from "node:test";
import assert from "node:assert/strict";
import { createTavusConversation, endTavusConversation, TAVUS_DR_PAWS_PAL_ID } from "@/lib/avatar/tavus-client";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

test("creates a conversation against the Dr. Paws PAL with the server-side key", async () => {
  let sentBody: Record<string, unknown> = {};
  let sentKey = "";
  const result = await createTavusConversation({
    apiKey: "tavus-test",
    conversationName: "test",
    fetchImpl: async (url, init) => {
      assert.equal(String(url), "https://tavusapi.com/v2/conversations");
      sentKey = (init?.headers as Record<string, string>)["x-api-key"];
      sentBody = JSON.parse(String(init?.body));
      return jsonResponse({ conversation_id: "c1", conversation_url: "https://daily.example/c1" });
    },
  });

  assert.equal(sentKey, "tavus-test");
  assert.equal(sentBody.pal_id, TAVUS_DR_PAWS_PAL_ID);
  assert.deepEqual(Object.keys(sentBody).sort(), ["conversation_name", "pal_id"]);
  assert.deepEqual(result, { ok: true, conversationId: "c1", conversationUrl: "https://daily.example/c1" });
});

test("does not call Tavus when the key is missing", async () => {
  let called = false;
  const result = await createTavusConversation({
    apiKey: undefined,
    conversationName: "x",
    fetchImpl: async () => {
      called = true;
      return jsonResponse({});
    },
  });
  assert.equal(result.ok === false && result.reason, "not_configured");
  assert.equal(called, false);
});

test("treats a malformed create response as upstream_error", async () => {
  const result = await createTavusConversation({
    apiKey: "k",
    conversationName: "x",
    fetchImpl: async () => jsonResponse({ unexpected: true }),
  });
  assert.equal(result.ok === false && result.reason, "upstream_error");
});

test("end posts to the conversation's end path and reports success", async () => {
  let path = "";
  const result = await endTavusConversation({
    apiKey: "k",
    conversationId: "c 1",
    fetchImpl: async (url) => {
      path = String(url);
      return jsonResponse({});
    },
  });
  assert.equal(path, "https://tavusapi.com/v2/conversations/c%201/end");
  assert.equal(result.ok, true);
});

test("end reports failure instead of throwing when Tavus errors", async () => {
  const result = await endTavusConversation({
    apiKey: "k",
    conversationId: "c1",
    fetchImpl: async () => jsonResponse({}, 500),
  });
  assert.equal(result.ok, false);
});
