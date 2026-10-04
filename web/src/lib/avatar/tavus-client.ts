const TAVUS_API_URL = "https://tavusapi.com/v2";
const DEFAULT_TIMEOUT_MS = 10000;

/** Dr. Paws in Echo mode. Echo bypasses Tavus's LLM and STT; MentorOS supplies the text. */
export const TAVUS_DR_PAWS_PAL_ID = "pb819fd12671";

export type TavusCreateResult =
  | { ok: true; conversationId: string; conversationUrl: string }
  | { ok: false; reason: "not_configured" | "timeout" | "upstream_error" };

type FetchLike = typeof fetch;

export async function createTavusConversation(options: {
  apiKey: string | undefined;
  conversationName: string;
  fetchImpl?: FetchLike;
}): Promise<TavusCreateResult> {
  if (!options.apiKey) return { ok: false, reason: "not_configured" };

  const result = await tavusRequest(options.apiKey, "/conversations", {
    method: "POST",
    body: { pal_id: TAVUS_DR_PAWS_PAL_ID, conversation_name: options.conversationName },
    fetchImpl: options.fetchImpl,
  });
  if (!result.ok) return result;

  const body = result.body as { conversation_id?: unknown; conversation_url?: unknown };
  if (typeof body.conversation_id !== "string" || typeof body.conversation_url !== "string") {
    return { ok: false, reason: "upstream_error" };
  }
  return { ok: true, conversationId: body.conversation_id, conversationUrl: body.conversation_url };
}

export async function endTavusConversation(options: {
  apiKey: string | undefined;
  conversationId: string;
  fetchImpl?: FetchLike;
}): Promise<{ ok: boolean }> {
  if (!options.apiKey) return { ok: false };
  const result = await tavusRequest(
    options.apiKey,
    `/conversations/${encodeURIComponent(options.conversationId)}/end`,
    { method: "POST", fetchImpl: options.fetchImpl },
  );
  return { ok: result.ok };
}

type TavusRequestResult = { ok: true; body: unknown } | { ok: false; reason: "timeout" | "upstream_error" };

async function tavusRequest(
  apiKey: string,
  path: string,
  options: { method: "POST"; body?: unknown; fetchImpl?: FetchLike },
): Promise<TavusRequestResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(`${TAVUS_API_URL}${path}`, {
      method: options.method,
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    return { ok: false, reason: timedOut ? "timeout" : "upstream_error" };
  }

  if (!response.ok) return { ok: false, reason: "upstream_error" };
  return { ok: true, body: await response.json().catch(() => ({})) };
}
