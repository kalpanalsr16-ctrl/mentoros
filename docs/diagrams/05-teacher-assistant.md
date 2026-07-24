# AI Lesson Assistant — structurally separate from student chat

Same UI shape as student `/chat` (`MessageBubble`/`MessageInput` reused directly), a completely different data path underneath. See [ADR-005](../adr/005-teacher-assistant-separate-domain.md).

```mermaid
sequenceDiagram
    participant T as Teacher
    participant API as /api/teacher/assistant
    participant TC as teacher_conversations (RLS)
    participant TM as teacher_messages (RLS)
    participant Agent as Teacher Assistant Agent
    participant RPC as insert_teacher_assistant_message()

    T->>API: POST { conversationId?, content }
    API->>TC: find-or-create, ownership check (teacher_id = auth.uid())
    Note over TC: A conversationId that isn't this teacher's own<br/>collapses to the same 403 as a nonexistent one

    API->>TM: INSERT role='user' (allowed by policy)
    API->>TM: SELECT full history for this conversation
    API->>Agent: generateTeacherAssistantReply(history)
    Note over Agent: Its own Anthropic client, own system prompt --<br/>does not import lib/llm/client.ts or anything under lib/agents/

    Agent-->>API: reply content
    API->>RPC: insert_teacher_assistant_message(conversationId, content)
    Note over TM,RPC: role='assistant' can ONLY be inserted through this<br/>SECURITY DEFINER function -- the table's own policy rejects it directly
    RPC->>TM: INSERT role='assistant'
    RPC-->>API: saved row
    API-->>T: { conversationId, userMessage, assistantMessage }
```

No arrow in this diagram ever touches `conversations` or `messages` (the student tables) — not because a policy forbids it, but because no code path here references them at all.
