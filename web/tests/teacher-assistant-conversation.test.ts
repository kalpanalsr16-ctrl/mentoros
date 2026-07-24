import { test } from "node:test";
import assert from "node:assert/strict";
import { runAssistantTurn } from "@/lib/teacher-assistant/manage-assistant-conversation";

/**
 * Only the ownership-check branch is unit-tested here -- it's genuinely
 * pure decision logic reachable without ever calling the real LLM. The
 * happy-path turn (create/find conversation -> save message -> call
 * generateTeacherAssistantReply -> save reply) is NOT unit-tested,
 * matching this codebase's existing precedent for every LLM-calling path
 * (api/chat/route.ts itself has no unit tests either) -- it's covered by
 * live verification against the real API instead.
 */
function mockSupabaseForbidden() {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    }),
  } as unknown as Parameters<typeof runAssistantTurn>[0];
}

test("runAssistantTurn returns forbidden for a conversationId the teacher doesn't own, without ever reaching the LLM call", async () => {
  const supabase = mockSupabaseForbidden();
  const result = await runAssistantTurn(supabase, "teacher-1", "someone-elses-conversation-id", "hello");
  assert.deepEqual(result, { status: "forbidden" });
});
