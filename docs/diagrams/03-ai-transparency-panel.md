# "View reasoning" — reconstructing a trace after the fact

The Observability Agent never runs *during* a request — it's a read-only report generator, queried only when someone actually wants to look.

```mermaid
sequenceDiagram
    participant U as Student or Teacher
    participant UI as TransparencyPanel
    participant API as /api/observability/trace/:traceId
    participant Obs as Observability Agent
    participant DB as events table

    Note over U,UI: Off by default -- opened via a message's "View reasoning" action,<br/>or standalone at /explorer (Architecture Explorer)
    U->>UI: click "View reasoning"
    UI->>API: GET /api/observability/trace/{traceId}
    API->>Obs: getObservabilityReport(traceId)
    Obs->>DB: SELECT * WHERE trace_id = ... ORDER BY created_at
    DB-->>Obs: every event row for that one turn
    Obs-->>API: reconstructed report (per-agent latency, tokens, cost, errors)
    API-->>UI: TraceView JSON

    UI->>UI: TraceNodeList renders one card per agent
    Note over UI: Evaluation node gets EvaluationScoreCard;<br/>every other agent gets AgentTraceNode -- same components<br/>whether reached from the in-chat panel or /explorer
```

RLS enforces who can request which `traceId`: a student's own self-read policy on `events` covers their own traces; a teacher's class-scoped policy covers only traces belonging to students in their own classes (same pattern as every other teacher-scoped screen).
