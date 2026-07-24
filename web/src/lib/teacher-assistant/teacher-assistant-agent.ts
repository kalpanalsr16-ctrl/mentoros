import Anthropic from "@anthropic-ai/sdk";

/**
 * AI Lesson Assistant (Epic G14) -- docs/ui-architecture/03_Teacher_
 * Studio.md's own framing: "new, teacher-facing generation capability,"
 * explicitly not a call from inside the student tutoring pipeline. This
 * module is deliberately self-contained (its own Anthropic client, model
 * constant, and error handling) rather than importing from
 * lib/llm/client.ts -- that file is flagged "touches completed
 * architecture" in 13_Implementation_Sequence.md's standing rule, and
 * the approved design proposal for this epic explicitly committed to
 * non-invasive reuse, same precedent as Homework Generator (Epic G13)
 * reusing Practice Agent's pattern without modifying practice-agent.ts.
 *
 * Deliberately NOT a multi-agent pipeline: no Router/Planning/
 * Personalization/Safety-layer-2/Evaluation involvement, per the
 * approved scope -- a single system-prompted call plus this
 * conversation's own history, nothing else.
 */

const anthropic = new Anthropic();
const MODEL = "claude-opus-4-8";
const MAX_TOKENS = 1024;

const SYSTEM_PROMPT = `You are an authoring assistant helping a teacher plan lessons and assessments for NCERT Class 3 Mathematics. You are talking to a teacher, not a student -- write for a professional educator, not a child. Help them brainstorm lesson ideas, explain concepts clearly for their own understanding, suggest example problems, or draft assessment questions. Keep suggestions concrete and classroom-ready. You are not connected to any lesson-planning or assessment-authoring tool -- the teacher will copy anything useful into those screens themselves.`;

export type TeacherAssistantMessage = { role: "user" | "assistant"; content: string };

export type TeacherAssistantResult =
  | { success: true; content: string; model: string; inputTokens: number; outputTokens: number }
  | { success: false; reason: string };

/**
 * A single, non-streaming Messages API call -- same deliberate
 * simplification as generateTeachingReply() in lib/llm/client.ts, for the
 * same reason: proving the path before investing in streaming
 * infrastructure for it.
 */
export async function generateTeacherAssistantReply(
  history: TeacherAssistantMessage[],
): Promise<TeacherAssistantResult> {
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      thinking: { type: "adaptive", display: "summarized" },
      messages: history,
    });

    const textBlock = response.content.find((block) => block.type === "text");

    if (!textBlock || textBlock.type !== "text" || !textBlock.text.trim()) {
      return { success: false, reason: "empty_response" };
    }

    return {
      success: true,
      content: textBlock.text,
      model: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return { success: false, reason: "rate_limited" };
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return { success: false, reason: "auth_error" };
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return { success: false, reason: "connection_error" };
    }
    if (err instanceof Anthropic.APIError) {
      return { success: false, reason: `api_error_${err.status}` };
    }
    return { success: false, reason: "unknown_error" };
  }
}
