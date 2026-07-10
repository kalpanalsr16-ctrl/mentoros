# M0-08 — Safety Filter

**Status:** ✅ Completed
**Date:** 2026-07-09

---

## Objective

Block a message before it reaches any reply-generation step if it matches a small set of clearly unsafe categories — self-harm, violence, sexual content, prompt injection — using deterministic pattern matching, since no AI model exists in the pipeline until M1.

---

## Why This Task Exists

The real Safety Agent ([03_Safety_Agent.md](../../05_Agent_Architecture/03_Safety_Agent.md)) is a full AI-driven component with prompt-injection defense, academic-integrity checks, age-appropriateness, and risk-level escalation — but building that properly now would mean designing against guesses rather than real usage patterns. This task builds the smallest honest safety net that can exist before any LLM is in the loop, deferring the full agent to M9 per the roadmap's stated sequencing, while making sure no M0 conversation can ship an unfiltered unsafe exchange in the meantime.

---

## Requirements

- Messages matching self-harm, violence, sexual-content, or prompt-injection patterns are detected before a normal reply is generated.
- An unsafe message still gets saved (it's part of the real conversation record), but its reply is a category-appropriate decline, not the usual placeholder.
- The self-harm decline points the student toward a real person, not just a refusal.
- The check happens for every message, with no way to bypass it from the client.

---

## Architecture Decisions

- **Regex/keyword matching, not an LLM call** — the only implementation strategy available before M1 introduces an LLM into the pipeline at all, and explicitly documented as intentionally simple in the source file itself.
- **Four categories** (`self_harm`, `violence`, `sexual_content`, `prompt_injection`), matching the categories most relevant to the risks of an unfiltered placeholder-reply chat loop being live in front of real students, with prompt-injection examples drawn directly from `03_Safety_Agent.md`'s own "Prompt Injection" section rather than invented independently.
- **The self-harm decline message deliberately does not include a hardcoded crisis hotline number** — the correct hotline depends on the student's region, which isn't known or confirmed yet. Shipping a wrong or US-only number to a student outside that region was judged worse than omitting one and pointing to a trusted adult instead. This was a deliberate, discussed trade-off, not an oversight.
- **`checkMessageSafety()` is checked before conversation/message creation** in `/api/chat`, and the unsafe path shares the same save→log→reply→save→log flow as the safe path (see M0-06/M0-07) rather than being a separate code branch — this guarantees an unsafe message is never silently dropped from the record, and that the two paths can't drift out of sync with each other.
- **No client-side-only filtering** — the check runs entirely in the `POST /api/chat` Route Handler, so a request bypassing the UI (e.g., a direct API call) is still filtered.

---

## Files Created

- `web/src/lib/safety/filter.ts` — `checkMessageSafety(content)`, `buildSafetyDeclineMessage(category)`, and the four `UNSAFE_PATTERNS` regexes.

## Files Modified

- `web/src/app/api/chat/route.ts` — runs `checkMessageSafety()` immediately after validating message content, before conversation creation; branches the logged event name (`message_received` vs `safety_blocked`, `reply_sent` vs `safety_reply_sent`) and the reply content (`buildPlaceholderReply` vs `buildSafetyDeclineMessage`) based on the result.

---

## Database Changes

None.

---

## API Changes

- `POST /api/chat` — unsafe messages now receive a decline reply instead of the placeholder reply; event names reflect the safety outcome (see M0-07).

---

## UI Changes

None beyond what a normal reply already renders — a decline shows up as an assistant message like any other.

---

## Testing Performed

- Ran roughly 20 test phrases spanning all four categories directly against `checkMessageSafety()`, confirming each was correctly flagged with the expected category and that clearly safe math questions were not false-flagged.
- Sent an unsafe test phrase through the live `/api/chat` endpoint as the signed-in test student; confirmed the message was saved, the reply was the category-appropriate decline (not the placeholder), and the logged event was `safety_blocked` / `safety_reply_sent` rather than the normal pair.
- Re-verified the same unsafe-phrase check manually against the deployed staging environment (see M0-10) as part of the final end-to-end pass.

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| Unsafe messages across all four categories are detected | ✅ Met (~20 test phrases) |
| An unsafe message still gets saved to the conversation | ✅ Met |
| The reply is a category-appropriate decline, not the placeholder | ✅ Met |
| The self-harm decline directs to a real person | ✅ Met |
| The check cannot be bypassed from the client | ✅ Met (enforced server-side) |

---

## Lessons Learned

- A safety net that's honest about its own limits (simple pattern matching, not a real classifier) is more useful than one that overstates its coverage — this shaped both the code comments and this document's framing of what M0's filter is and isn't.

---

## Open Issues

- No region-specific crisis hotline is included in the self-harm decline message, pending confirmation of MentorOS's target region(s). Should be revisited before this filter (or its M9 successor) is relied on with real students at scale.
- The full AI-driven Safety Agent (academic integrity, age-appropriateness, risk escalation) remains out of scope until M9, per the documented agent architecture.

---

## Next Task

[M0-09 — Monitoring](M0-09-Monitoring.md)
