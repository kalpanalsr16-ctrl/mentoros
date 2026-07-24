# Architecture Decision Records

Short, scannable records of the decisions that shaped MentorOS's structure — not a replay of every narrative doc, but the calls that would be easy to second-guess or accidentally reverse without knowing why they were made.

Format: Context → Decision → Consequences. Status is `Accepted` unless noted otherwise; none have been superseded.

| ADR | Decision |
|---|---|
| [001](001-single-codebase.md) | One Next.js codebase for frontend and backend, not separate services |
| [002](002-events-table-message-broker.md) | An `events` table substitutes for a message broker |
| [003](003-multi-agent-pipeline.md) | A real multi-agent pipeline, not one large prompt |
| [004](004-security-definer-assistant-inserts.md) | Assistant-role message inserts go through a `SECURITY DEFINER` RPC, not a plain policy |
| [005](005-teacher-assistant-separate-domain.md) | The AI Lesson Assistant uses a wholly separate data domain from student chat |
| [006](006-manual-only-authoring.md) | Lesson Planner and Assessment Builder are manual-only, with no invented AI-authoring |
| [007](007-teacher-scoped-evaluation-dashboard.md) | The Evaluation Dashboard is teacher-scoped, not a new admin role |
| [008](008-custom-observability-not-langfuse.md) | A custom Observability Agent powers in-product transparency; Langfuse is reserved for later, separate engineering-side monitoring |
