# A concept-teaching turn

The most common path: a student asks something that isn't a practice or assessment request. Traced from `web/src/app/api/chat/route.ts`.

```mermaid
sequenceDiagram
    participant S as Student
    participant R as /api/chat
    participant Safety as Safety Agent
    participant Router as Router Agent
    participant Plan as Planning Agent
    participant Pers as Personalization Agent
    participant Concept as Concept Agent
    participant Eval as Evaluation Agent
    participant DB as events table

    S->>R: POST message
    R->>Safety: checkMessageSafety() [Layer 1: keyword filter]
    R->>Safety: classifySafetyWithClaude() [Layer 2: LLM classifier]
    Safety-->>R: safe
    R->>DB: log "message_received"

    R->>Router: classifyIntentWithClaude()
    Router-->>R: intent = Concept
    R->>DB: log "intent_detected"

    R->>Plan: buildPlanningContext() + decidePlan()
    Plan-->>R: LearningPlan (strategy, concept, objectives)
    R->>DB: log "learning_plan_created"

    R->>Pers: decidePersonalization()
    Pers-->>R: PersonalizationProfile (style, pace, difficulty)
    R->>DB: log "personalization_profile_created"

    R->>Concept: explainConcept()
    Concept-->>R: structured teaching response
    R->>DB: log "concept_explained"

    R-->>S: stream reply (Markdown + LaTeX)
    R->>DB: log "reply_sent"

    Note over R,Eval: Fires after the reply is already sent -- never blocks the student's response
    R->>Eval: evaluateInteraction()
    Eval-->>R: quality scores (groundedness, accuracy, safety, ...)
    R->>DB: log "evaluation_completed"
```

Every arrow into `events` shares one `trace_id` — that's what the AI Transparency Panel (diagram 03) reconstructs later.
