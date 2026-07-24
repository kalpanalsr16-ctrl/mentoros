# An assessment turn — the deepest path

The only path that also runs Reflection and Memory — both are gated specifically on a *successful* Assessment result (their documented trigger event), not on every turn.

```mermaid
sequenceDiagram
    participant S as Student
    participant R as /api/chat
    participant Safety as Safety Agent
    participant Router as Router Agent
    participant Plan as Planning Agent
    participant Assess as Assessment Agent
    participant Reflect as Reflection Agent
    participant Memory as Memory Agent
    participant Eval as Evaluation Agent
    participant DB as events table
    participant PG as learner_concept_mastery

    S->>R: submits an answer
    R->>Safety: two-layer check
    Safety-->>R: safe
    R->>Router: classifyIntentWithClaude()
    Router-->>R: intent = Assessment
    R->>Plan: buildPlanningContext() + decidePlan()
    Plan-->>R: LearningPlan

    R->>Assess: evaluateResponse()
    Assess-->>R: AssessmentReport (masteryScore, status, misconceptions, feedback)
    R->>DB: log "assessment_completed"
    R-->>S: stream feedback (does not wait on what follows)

    rect rgba(87, 80, 184, 0.08)
    Note over R,Memory: Internal only -- never changes what the student already received
    R->>Reflect: reflectOnSession()
    Reflect-->>R: Learning Reflection Report
    R->>DB: log "reflection_completed"

    R->>Memory: updateLearnerProfile()
    Memory->>PG: merge mastery evidence
    Memory-->>R: profile updated
    R->>DB: log "learner_profile_updated"
    end

    R->>Eval: evaluateInteraction()
    Eval-->>R: quality scores, safety ceiling applied if unsafe
    R->>DB: log "evaluation_completed"
```

`learner_concept_mastery` written here is what powers Progress, the Learning Roadmap, Class/Student Overview, Progress Analytics, and Misconception Reports — one write path, read by five different screens across three roles.
