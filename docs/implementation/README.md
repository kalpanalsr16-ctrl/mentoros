# Implementation Documentation

## Why This Folder Exists

The rest of this repository describes MentorOS in two layers: what it should become ([01_Vision.md](../../01_Vision.md), [02_PRD.md](../../02_PRD.md), the agent specs in [05_Agent_Architecture/](../../05_Agent_Architecture/)) and how it's built ([06_Technical_Architecture.md](../../06_Technical_Architecture.md), [08_Roadmap.md](../../08_Roadmap.md)). Neither layer records what actually happened when a task was implemented — which files were touched, what broke, what got verified, what was deferred.

This folder is that record. It exists so that:

- Anyone (including a future AI assistant with no memory of this conversation) can pick up exactly where a task left off without re-deriving context.
- Decisions made *during* implementation — not just planned in advance — are captured before they're forgotten (e.g. "we used `nvm` instead of Homebrew because neither was installed").
- Verification evidence isn't lost. "It worked" is a claim; a testing log is evidence.

The roadmap says *what* to build and *in what order*. The architecture doc says *what it's built with*. This folder says *what was actually done*.

---

## How These Documents Are Organized

One file per roadmap task, one milestone per set of files. Right now that's Milestone M0 (Foundation & Safety Baseline, per [08_Roadmap.md](../../08_Roadmap.md)), broken into the ten tasks it was split into during implementation planning. Future milestones (M1, M2, ...) will get their own file sets following the same pattern, prefixed accordingly (`M1-01-...`, `M2-01-...`, etc.).

A file is written **after** a task is implemented and verified — not before. Documenting a task that hasn't been built yet would mean guessing, which defeats the purpose of this folder being a factual record rather than a second plan.

---

## Naming Convention

```
M<milestone>-<task-number>-<Task-Name>.md
```

- `M<milestone>` — the roadmap milestone this task belongs to (`M0`, `M1`, ...), matching [08_Roadmap.md](../../08_Roadmap.md).
- `<task-number>` — two-digit, zero-padded, sequential within the milestone (`01`, `02`, ... `10`).
- `<Task-Name>` — the task's short name in Title-Case-With-Hyphens.

Example: `M0-03-Database-Schema.md` is the third task of Milestone 0, covering the database schema.

---

## What Every Implementation Document Captures

Every file in this folder follows the same fixed template, in this order:

| Section | Captures |
|---|---|
| **Title** | The task name and milestone/task number |
| **Status** | `⏳ Not Started`, `🟡 In Progress`, or `✅ Completed` |
| **Date** | When the task was completed (or last touched, if still in progress) |
| **Objective** | The one or two sentences this task existed to achieve |
| **Why This Task Exists** | The reasoning tying it back to the roadmap and architecture docs — not just what, but why it matters and why now |
| **Requirements** | What had to be true for this task to count as done, as scoped before work began |
| **Architecture Decisions** | Any choices made *during* implementation — including ones not fully specified in advance — and the reasoning behind them |
| **Files Created** | New files added to the repository |
| **Files Modified** | Existing files changed, and what changed in them |
| **Database Changes** | Schema, tables, columns, policies, migrations — or "None" |
| **API Changes** | New or modified routes/endpoints — or "None" |
| **UI Changes** | New or modified screens/components — or "None" |
| **Testing Performed** | What was actually run, and the actual result — not "should work," but what was observed |
| **Acceptance Criteria** | The task's definition of done, each item marked met or not |
| **Lessons Learned** | Anything surprising, anything that would change next time, anything worth remembering |
| **Open Issues** | Anything deferred, unresolved, or flagged for later — even minor things |
| **Next Task** | Which document picks up from here |

A task document is only as useful as its honesty. "Testing Performed" should describe what was actually run and observed, not what should theoretically work — the whole point of this folder is to be trustworthy evidence, not a status announcement.
