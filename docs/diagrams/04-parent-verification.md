# Parent-child linking — zero access until explicitly verified

The core guarantee: a `pending` row grants a parent nothing. No read policy anywhere in the schema references `parent_links` unless `status = 'verified'` — and there is deliberately no way to reach `'verified'` except through the student's own approval.

```mermaid
sequenceDiagram
    participant P as Parent
    participant API as /api/parent/link-request
    participant DB as parent_links (RLS)
    participant St as Student
    participant Fn as respond_to_link_request()

    P->>API: POST link-request { studentId }
    API->>DB: INSERT status='pending'
    Note over DB: WITH CHECK enforces status='pending' at the DB layer --<br/>a parent cannot insert a pre-verified row even bypassing the API entirely
    DB-->>P: pending request created

    Note over P,St: Parent has zero read access to anything right now --<br/>no policy on profiles/learner_concept_mastery/achievements/<br/>revision_schedule/events references parent_links at this status

    St->>Fn: respond_to_link_request(linkId, 'approve' | 'reject')
    Fn->>DB: UPDATE status = 'verified' or 'rejected'
    Note over Fn: The ONLY path to 'verified' in the entire schema

    alt approved
        DB-->>P: status = 'verified'
        Note over P: Now, and only now, every parent-scoped read policy<br/>(profiles, mastery, achievements, revision, events) resolves
        P->>DB: read child's progress, strengths, recommendations, weekly summary
    else rejected
        DB-->>P: status = 'rejected'
        Note over P: Still zero access
    end
```

Every parent-facing read this product has (Parent Dashboard, Child Detail, Weekly Summary) is scoped through this single `status = 'verified'` gate — there's no second, looser path into the same data.
