# Chat Experience

The most important screen in the product — the only one that currently exists (`/chat`, live and working since M0) and the one every other document points back to. This is the full specification the Design System's own Chat Experience section (`docs/design-system/04-UX-Design-Experiences.md` §13) referenced but deliberately didn't fully expand.

---

## Conversation layout

Single-column message stream, capped at 720px width (Design System §6 grid), student messages right-aligned (`brand-indigo-500` fill), assistant messages left-aligned (`ink-050` fill), input fixed to the bottom. This is `MessageList`/`MessageInput`'s existing structure, kept — the upgrade is what renders *inside* a message, not the overall layout.

## Streaming responses

Today: `generateTeachingReply`/`generateConceptExplanation`/etc. use non-streaming `messages.create`/`messages.parse` calls (`web/src/lib/llm/client.ts`) — the student waits for the full response. **This document specifies the target UI behavior only** (per this phase's constraint: no backend/API modification) — actually enabling streaming is Anthropic SDK-level work (`stream: true`) belonging to a future implementation pass, not this documentation phase. UI target: text appears token-by-token as it arrives, with a blinking-caret indicator (Design System §17.3) replacing the current "Sending..." button-disabled state. **This is the single largest gap between this document's target and what `/api/chat` does today** — flagged explicitly so implementation doesn't assume streaming is a trivial frontend-only change.

## Markdown

Assistant replies render Markdown (headings, lists, bold/italic, inline code) instead of today's `white-space: pre-wrap` plain text. Requires a Markdown renderer dependency (not chosen in this document — a Technical Design decision for whichever implementation pass builds this, flagged as a new-dependency decision needing the same sign-off pattern established in the Design System, doc 06 §"Tooling decisions").

## LaTeX

Math notation (fractions, exponents, equations) renders properly — directly required by Design Principle 1.2/1.3 given MentorOS is a math tutor; today's flattened plain text cannot express `\frac{1}{2}` at all. Requires a LaTeX rendering dependency (e.g. KaTeX), same flagged-decision status as Markdown above. Concept/Practice/Assessment Agent's *output* already contains this content conceptually (explanation/example text) — this is a rendering-layer change only, not a change to what any agent produces.

## Code blocks

Lower priority than Markdown/LaTeX for a Primary/High School math tutor, but the same renderer that handles Markdown typically handles fenced code blocks for free — specified here for completeness (curriculum expansion beyond math, per the long-term Learning Commons vision, could eventually need this) rather than as a near-term priority.

## Math rendering

Covered by LaTeX above — listed separately in the brief, treated as the same requirement here to avoid two documents contradicting each other on one dependency decision.

## Message actions

Per-message affordances, hover/focus-revealed (not always-visible clutter, per Design Principle 1.2): **Copy** (all messages), **Regenerate** (assistant messages only, calls `/api/chat` again with the same context — no new endpoint needed), **View reasoning** (assistant messages produced by Concept/Practice/Assessment Agent only — opens the AI Transparency panel scoped to that specific message's `trace_id`, per `07_AI_Transparency_Panel.md`).

## Voice mode

**Named as an entry point, not designed in detail** — full design belongs to Phase 7 per `15_Phase2_Roadmap.md`. This document reserves the *location*: a microphone icon in `MessageInput`, and a distinct "voice conversation" visual mode toggled from the chat header — both are extension points (`12_Future_Extensibility.md`), not built now.

## Typing indicators

Two distinct moments, not one: (1) while MentorOS is deciding/generating (today's "Sending..." equivalent, replaced by the streaming caret above once that ships), and (2) — new — a brief "thinking through Safety, then Router..." micro-state during the pipeline's pre-generation steps, directly in service of Design Principle 1.3 (show your work), sourced from real event names (`message_received`, `intent_detected`) rather than being a fake decorative sequence.

## Safety messages

Rendered via `MessageBubble`'s dedicated `safety` visual variant (Design System §3.5/§13.3) — never styled as an error. Copy comes from the existing, already-shipped `buildSafetyDeclineMessage()` (`web/src/lib/safety/filter.ts`) — this document changes nothing about what that function returns, only how the resulting message is visually framed.

## Assessment messages

Rendered via `AssessmentFeedbackCard` (Design System §7.3) instead of today's flattened `formatAssessmentReportAsReply()` text — structured mastery score (ring), status badge, misconceptions list, recommended next step, all sourced from the same `AssessmentReport` shape Assessment Agent already produces. No backend change; a rendering-layer upgrade of existing structured data that's currently being flattened to text before it ever reaches the client.

## Reflection messages

**Not rendered to the student at all, by design** — Reflection Agent's output is explicitly internal (`11_Reflection_Agent.md`, M8's own scope decision: "internal, not shown to the student"). This document does not propose changing that. Reflection's output *is* visible in the AI Transparency panel (`07_AI_Transparency_Panel.md`), for a teacher or curious student who opens it — but never surfaces unprompted in the main conversation stream.

## Memory updates

Also internal by default (same reasoning as Reflection) — but unlike Reflection, a Memory update has a legitimate, small, positive surface in the main stream: a brief, dismissible inline note ("Your mastery in Addition just went up to 78%") triggered by a `learner_profile_updated` event, styled quietly (`caption` type, `success` accent used sparingly) — not a popup, not blocking, not present on every turn (only when mastery actually changed meaningfully). This is new UI behavior this document is proposing, not something that exists today.

## Agent transparency entry points

Two, matching `07_AI_Transparency_Panel.md`'s two contexts: (1) the collapsible side panel (off by default for students, per Design System §13.2), toggled from the chat header; (2) the per-message "View reasoning" action (§"Message actions" above), which opens the same panel pre-scoped to one specific turn's `trace_id` rather than the whole conversation.
