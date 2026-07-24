# Sequence diagrams

Real request flows through the actual pipeline — traced from `web/src/app/api/chat/route.ts` and the relevant epics, not idealized. Rendered natively by GitHub and by Claude Artifacts (` ```mermaid ` fences).

| Diagram | Shows |
|---|---|
| [01-chat-turn-teaching.md](01-chat-turn-teaching.md) | A concept-teaching turn — the most common path |
| [02-chat-turn-assessment.md](02-chat-turn-assessment.md) | An assessment turn — the deepest path, including Reflection + Memory |
| [03-ai-transparency-panel.md](03-ai-transparency-panel.md) | How "View reasoning" reconstructs a trace after the fact |
| [04-parent-verification.md](04-parent-verification.md) | The consent-gated parent-child linking flow |
| [05-teacher-assistant.md](05-teacher-assistant.md) | The AI Lesson Assistant's structurally separate data path |
