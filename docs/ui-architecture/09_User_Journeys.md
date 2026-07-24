# User Journeys

Complete, step-by-step paths through the product for each persona. **◆** marks a decision point. **🎙** marks a future voice entry point (Phase 7, named per `05_Chat_Experience.md` and `12_Future_Extensibility.md`, not built).

---

## Student Journey

```
Sign up (/sign-up)
  → Onboarding: Welcome → Grade? ◆ → Goals? (skippable after grade) → Start!
  → Student Dashboard (/app)
      ◆ "Continue learning" → Chat (/chat)
          → Ask a question 🎙
              ◆ Router classifies intent
                  → Learning: Concept Agent reply (structured, or plain-text if
                    still Diagnostic-gated — 05_Chat_Experience.md)
                  → Practice: PracticeQuestionCard rendered inline
                      → Student answers ◆ → Assessment Agent feedback
                          → (if mastery changed) inline Memory-update note
                          → Reflection runs internally (never shown)
                  → Assessment: "test me" → same Assessment path as above
              ◆ Safety Agent blocks → calm decline message, pipeline stops here
          → optional: expand "How I answered" panel (07_AI_Transparency_Panel.md)
      ◆ or → Learning Roadmap (/app/roadmap) → pick a concept → Chat pre-seeded
      ◆ or → Progress (/app/progress) → see weak concept → Revision Planner (/app/revision)
          → "Revise now" → Chat pre-seeded with that concept
      ◆ or → Achievements (/app/achievements) → streak/milestone view
  → Profile (/app/profile) — grade/goals/style, editable any time
```

**Decision points:** grade selection (blocks Personalization quality if skipped), Router's intent classification (silently determines which of Concept/Practice/Assessment runs), Safety Agent's gate (can end the turn immediately).

**Future voice entry points:** asking a question by voice instead of typing (Chat); a spoken "how am I doing?" query routed to Progress; voice-based onboarding as an alternative to the chip-selection flow.

---

## Teacher Journey

```
Sign up (/sign-up) — role: teacher
  → Studio Dashboard (/studio)
      ◆ "Plan a Lesson" → Lesson Planner (/studio/lessons)
          → Curriculum Explorer reference lookup (Tabs: MentorOS / Learning Commons)
              ◆ pick a Learning Commons standard → source-attributed reference card
          → outline → detail → review → save
      ◆ or "Build an Assessment" → Assessment Builder (/studio/assessments)
          → same authoring pattern → save
      ◆ or "Explore Curriculum" → Curriculum Explorer (/studio/curriculum) directly
  → Classes (/studio/classes) → create a class → share class code
      → (student enrolls — verification flow not designed in this phase, see 00_Overview.md)
      → Class Overview (/studio/classes/:classId)
          ◆ spot a struggling student → Student Overview (/studio/students/:studentId)
              → review mastery + misconceptions
              ◆ → Intervention Planner (/studio/interventions) → suggested action
                  → Homework Generator (/studio/homework), concept pre-selected
      → Misconception Reports (/studio/misconceptions) — class-wide pattern view
      → Progress Analytics (/studio/analytics) — trend over time
  → Settings (/studio/settings) → Integrations → Learning Commons
      (/studio/integrations/learning-commons) → connect API key
```

**Decision points:** which authoring entry point to use (Lesson Planner vs. AI Lesson Assistant — both reach the same underlying capability, per `03_Teacher_Studio.md`); whether to pull a Learning Commons reference or rely on MentorOS's own curriculum only.

**Future voice entry points:** none proposed for Teacher Studio — a professional authoring tool's primary interaction stays text/click-driven; voice is a Student Experience and Chat Experience concept in this architecture, not extended to Teacher Studio without a separate justification.

---

## Parent Journey

```
Sign up (/sign-up) — role: parent
  → Link to a child ◆ (consent/verification flow — not designed in this phase,
    see 00_Overview.md's Open Flags; parent_links row created with status='pending')
  → (status becomes 'verified' via whatever flow is decided later)
  → Parent Dashboard (/parent)
      → Weekly Summary card (plain-language digest)
      ◆ → Child Detail (/parent/children/:studentId)
          → Progress, Strengths, Weaknesses, Recommendations, Revision Status,
            Achievements — all read-only, all summarized, none actionable
            (this portal has no authoring/intervention capability by design,
            matching 03_User_Personas.md's scope for this persona)
  → (future) Notifications: weekly summary ready, achievement unlocked
```

**Decision points:** the consent/verification step is the only real decision point in this journey, and it's the one explicitly not resolved by this architecture pass.

**Future voice entry points:** none proposed — this is a low-frequency, read-only, summary-consumption surface; voice adds little here.

---

## Administrator Journey (future) — not designed

Named for completeness. No role, no schema, no screens exist for this persona in this phase — see `12_Future_Extensibility.md` for the reasoning and the extension point.
