# Technical Architecture

**Product:** MentorOS

**Version:** 1.0

**Status:** Draft

**Author:** Kalpana Yadav (with AI Platform Engineering)

**Scope:** Milestone M0 onward

---

# Purpose

This document decides the actual technology MentorOS is built on — what runs the website, where data lives, which AI provider answers questions, where the code is hosted, and how we know when something breaks.

The [08_Roadmap.md](08_Roadmap.md) plan decided *what* gets built and *in what order*. This document decides *what it's built with*, before any of it gets built.

Nothing here is about teaching logic, agent prompts, or curriculum content — those come later, once this foundation exists.

---

# Guiding Principles

Every choice in this document follows from five rules:

1. **One person must be able to build, run, and understand the whole system.** No tool that requires a dedicated specialist to operate.
2. **Fewer vendors beats more "best-of-breed" tools.** One dashboard and one bill is worth more than a marginally better point solution.
3. **Every choice must have a free tier that comfortably covers a pilot** (one topic, a handful of test students).
4. **Prefer boring, mainstream, well-documented technology over novel tools.** Boring technology has more tutorials, more Stack Overflow answers, and fewer surprises.
5. **Add complexity only when a milestone actually requires it.** Nothing here is built for a scale MentorOS doesn't have yet.

---

# How to Read This Document

Each technology category below follows the same shape:

- **Recommendation** — the one tool we're using, stated plainly.
- **Why** — the reasoning, including what else was considered and why it lost.
- **When it's needed** — one of:
  - 🟢 **Required for M0** — must exist before Milestone 0 can be called done.
  - 🔵 **Set up in M0, used starting M1** — the account/setup is cheap to do now, but nothing depends on it until real AI logic begins.
  - ⚪ **Deferred** — not needed until a specific later milestone, named explicitly.

No engineering background is assumed. Terms like "API," "vendor," or "serverless" are explained in plain language the first time they matter.

---

# Architecture at a Glance

```
                        Student
                           │
                     (web browser)
                           │
                           ▼
              ┌─────────────────────────┐
              │   MentorOS Application   │   ← one codebase
              │   (Next.js, TypeScript)  │      handles both the screen
              │                          │      the student sees AND the
              │  - Chat screen           │      server-side logic behind it
              │  - Agent logic (M1+)     │
              └─────────┬───────┬────────┘
                        │       │
                        │       └────────────────────┐
                        ▼                             ▼
              ┌───────────────────┐         ┌───────────────────────┐
              │      Supabase      │         │     Anthropic API      │
              │  (one vendor for)  │         │   (Claude — the AI      │
              │  - Database        │         │    that reads, retrieves,│
              │  - Sign-in / Auth  │         │    and explains)        │
              │  - Knowledge search │         └───────────────────────┘
              │  - File storage    │
              └───────────────────┘

              Hosting: Vercel (runs the application, staging + production)
              Watching for problems: Sentry (errors) + Observability Agent/AI
              Transparency Panel (AI quality, in-product, shipped M9+) —
              Langfuse (AI quality, engineering-side) proposed for Phase 5,
              not yet implemented — see §10
```

The whole system is two vendors deep for almost everything: **Vercel** runs the code, **Supabase** holds the data, **Anthropic** provides the intelligence. Everything else (Sentry, the in-product Observability Agent, and eventually Langfuse) is a focused add-on, not a foundation.

---

# Two Decisions That Shape Everything Else

Before the category-by-category list, two decisions apply across the whole system and are worth understanding up front.

## Decision 1 — One Codebase, Not Many Services

MentorOS could be built as a separate "frontend" (what the student sees) talking to a separate "backend" (where the thinking happens), each deployed independently. Many real companies build it that way — but usually because multiple teams need to work on each piece independently, which isn't the situation here.

**We're building it as a single application instead.** The screen the student sees and the server-side logic that powers it live in the same project, written in the same language, deployed together. This is sometimes called a "monolith," and for a solo builder it is almost always the right starting shape: one place to look for any given piece of behavior, one deployment to manage, no need to keep two projects' dependencies in sync.

If MentorOS ever needs to split these apart — for example, if the agent logic becomes heavy enough to need its own scaling behavior, separate from the chat screen — that split can happen later without throwing away the frontend work. Starting split and merging back together is much more painful than starting merged and splitting later.

## Decision 2 — Events Are Logged, Not Brokered

The architecture documents (particularly [14_Event_Driven_Architecture.md](14_Event_Driven_Architecture.md)) describe MentorOS as "event-driven" — agents publish events like `IntentDetected` or `ConceptExplained`, and other agents react to them, rather than calling each other directly.

At large scale, "event-driven" usually means running a dedicated message broker — specialized software whose only job is reliably passing these event messages between independent services (examples include Kafka or Amazon SQS). That is real infrastructure to run, monitor, and pay for, and it solves problems MentorOS doesn't have yet: multiple independent services reacting to the same event, or agents that need to run out of order or be retried independently.

**For M0 through roughly M6, MentorOS gets the same architectural benefits a much simpler way:**

- Agents are still separate, well-defined functions, each with one job — matching the documented design.
- They're called directly, one after another, inside a single request (Router → Retrieval → Concept, in order) instead of publishing to a queue and waiting.
- Every step is still recorded as an event in the database, in order, with a shared trace ID — so we keep the observability, replay, and debugging benefits the architecture docs describe.

This gets us everything the documented design is actually *for* — traceability, single-responsibility agents, the ability to add new agents without rewriting old ones — without running a message broker before we have any evidence we need one. If MentorOS later needs true parallel agent execution, background retries, or multiple independent systems reacting to the same event, a real event system can be introduced then, informed by real usage patterns instead of a guess made on day one.

---

# Technology Choices

## 1. Frontend — What the Student Sees

**Recommendation: Next.js (React), written in TypeScript.**

**Why:** The frontend needs to handle a live chat conversation — messages appearing as they're typed, a response streaming in word by word, a smooth back-and-forth feel. React is the most widely used toolkit for building interfaces like this, and Next.js is the most widely used way to build a full application (not just a screen) with React. Popularity matters practically here: more tutorials, more available help, and — since an AI coding assistant will be doing much of the hands-on building — better results from that assistant, because it has seen this combination far more often than any niche alternative.

TypeScript (rather than plain JavaScript) adds a layer of automatic checking that catches a category of mistakes — like accidentally treating a number as a word — before the code ever runs. For a solo builder relying heavily on an AI assistant to write code, this checking acts as a second set of eyes, catching subtle bugs the assistant might otherwise introduce silently.

**What we considered instead:** A plain HTML/JavaScript page would be simpler to *read* line-by-line, but rebuilds from scratch the things Next.js gives for free — reactive updates, page routing, and (critically, see Decision 1) a place for server-side logic to live in the same project. A separate single-page app plus a separate backend service was rejected for the same reason: two deployments, two sets of secrets, and cross-origin configuration to manage, for no benefit at our current scale.

**When it's needed:** 🟢 Required for M0.

---

## 2. Backend — Where the Thinking Happens

**Recommendation: Server-side code inside the same Next.js application (no separate backend service).**

**Why:** Per Decision 1, the agent logic (Router, Retrieval, Concept, etc., as they're built milestone by milestone) runs as server-side functions within the Next.js project — not as a separately hosted service. Next.js supports this natively: parts of the code run only on the server, never sent to the student's browser, which is exactly where API keys and database access need to live.

Each agent from the architecture docs becomes its own function, mirroring the one-file-per-agent structure already used in [05_Agent_Architecture/](05_Agent_Architecture/) — a `router.ts`, a `conceptAgent.ts`, and so on — called in sequence by a small "orchestrator" function that represents the conversation flow for that milestone.

**A deliberate non-choice:** we are not adopting a dedicated "AI agent framework" (tools that promise to manage multi-agent orchestration for you) for M0–M1. Those frameworks add a layer of behavior that's harder to inspect when something goes wrong, and MentorOS's early agent count (2–3 agents in a fixed sequence) doesn't need one. Plain functions calling the Anthropic API directly are easier to debug and give full visibility into what's actually happening — important when a non-engineer builder needs to reason about system behavior alongside an AI assistant. This can be revisited if orchestration complexity grows substantially (around M6, when Planning and Reflection introduce real branching logic).

**Future-proofing note:** if MentorOS later needs scheduled background work (for example, calculating which students are "due for revision" every night), Vercel supports scheduled jobs natively, without introducing a new hosting service. This isn't needed until roughly M5–M6 and is mentioned only so the eventual need doesn't require re-architecting.

**When it's needed:** 🟢 Required for M0 (even the placeholder/echo response in M0 runs through this layer).

---

## 3. Database — Where Information Is Stored

**Recommendation: Postgres, hosted by Supabase.**

**Why:** MentorOS's own [13_System_State_Model.md](13_System_State_Model.md) describes eight distinct, clearly related categories of information — sessions, conversations, learner profiles, and so on — each with rules about who's allowed to change what. That's a natural fit for a **relational database**: one that organizes information into related tables (Students, Sessions, Messages, Concepts...) and can enforce rules like "a message must belong to a real session" automatically, rather than trusting every piece of code to get it right. Postgres is the most established, capable open-source relational database available, and is effectively the industry default choice today.

**Why Supabase specifically, rather than "just Postgres":** Supabase is a company that runs Postgres for you and bundles several other things MentorOS needs on top of the same database — sign-in/authentication, a place to search trusted content by meaning (see Vector Database below), and file storage. Using Supabase means **one vendor, one dashboard, one bill covers four of this document's categories** (Database, Authentication, Vector Database, Storage) instead of stitching together four separate specialized companies. For a solo builder, this is one of the single biggest complexity reductions available — fewer accounts to manage, fewer credentials to keep straight, one thing to learn well instead of four things to learn shallowly.

**What we considered instead:** A specialized "vector database" company (like Pinecone) for the knowledge-search piece, a separate authentication company (like Auth0) for sign-in, and a separate file-storage company (like Amazon S3) were all considered and rejected for now — each is a fine product, but together they'd mean four vendors, four API keys, and four things that could each independently break, for capability MentorOS doesn't need at this scale. Revisit this if the knowledge base grows to a size (hundreds of thousands of pieces of content across many subjects) where a specialized vector database's extra performance becomes worth the added complexity — not expected before M9 at the earliest, if ever.

**When it's needed:** 🟢 Required for M0 (accounts and conversation storage).

---

## 4. Authentication — How Students Sign In

**Recommendation: Supabase Auth.**

**Why:** Since we're already using Supabase for the database, its built-in sign-in system is effectively free to add — no new vendor, no new account. It supports the basics MentorOS needs now (email + password) and can add other sign-in methods (like "Sign in with Google") later without switching providers. It's also built to work naturally with Supabase's database permission rules, meaning we can enforce "a student can only ever see their own data" at the database level itself, not just in application code — a meaningful safety net given this product serves children.

**What we considered instead:** A dedicated identity company (Auth0, Clerk) offers more advanced enterprise features MentorOS doesn't need yet (like single sign-on for large organizations). Building sign-in completely from scratch was rejected outright — authentication is a notoriously easy thing to get subtly wrong in ways that create real security holes, and Supabase's version is well-tested by many other companies already.

**When it's needed:** 🟢 Required for M0.

---

## 5. Vector Database — How MentorOS Finds the Right Textbook Content

**Recommendation: Postgres with the pgvector extension, inside the same Supabase database.**

**Why:** Starting in Milestone 1, MentorOS needs to find the right piece of trusted content (a definition, an example) to answer a student's question — this is what the architecture docs call "Retrieval" and what's more broadly known as **RAG** (Retrieval-Augmented Generation): looking up real material before writing an answer, instead of trusting the AI's memory alone. Doing this well requires comparing pieces of text by *meaning*, not just matching exact words — which needs a "vector database," a system built to store and search a mathematical representation of meaning called an embedding.

Rather than adding a fourth specialized vendor for this, Postgres has a well-established extension called **pgvector** that adds this exact capability directly into the same database we're already using. At MentorOS's Milestone 1 scale — one topic, a few dozen pieces of source content — pgvector's performance is more than sufficient. This means retrieval, structured data, and everything else all live in one place, queried the same way, backed up the same way, secured the same way.

**What we considered instead:** Dedicated vector database companies (Pinecone, Weaviate, Qdrant) offer better raw search performance at very large scale (millions of content chunks across many subjects). That's not our scale for years, if ever, on the current roadmap. If the knowledge base eventually grows dramatically past a single-vendor Postgres database's comfortable capacity, this is the one component most likely to be swapped out later — but that's a "nice problem to have" that indicates real success, not something to solve preemptively.

**When it's needed:** 🔵 Set up in M0 (enabling the extension is a few minutes of work), used starting M1 when real retrieval begins.

---

## 6. LLM Provider — The AI That Reads and Explains

**Recommendation: Anthropic's Claude, via the official Anthropic API, starting with the Claude Opus model family.**

**Why:** Every "explain this concept" or "check this answer" moment in MentorOS is ultimately a request to a large language model. A few things make Claude the right fit specifically for an education product serving children:

- **Instruction-following and safety behavior.** MentorOS's own principles (see [00_Product_Principles.md](00_Product_Principles.md)) demand a system that stays within firm boundaries — age-appropriate language, refusing to just hand over homework answers, honest about uncertainty rather than inventing facts. Claude is built and evaluated with exactly this kind of careful, bounded behavior as a priority, which reduces (though never eliminates) the work MentorOS's own Safety Agent has to do.
- **Cost-efficient handling of repeated context.** MentorOS's multi-agent design means many calls share a lot of the same background information (the same system instructions, the same retrieved textbook content) within one conversation turn. Claude supports "prompt caching" — a way to avoid re-paying for that repeated context on every single call — which matters once usage grows past the pilot stage.
- **A model for every job, without changing provider.** Anthropic offers models at different capability and cost points (from a fastest/cheapest tier up to the most capable tier) that all speak the same API. This means a cheap, fast model can eventually handle simple classification work (like the Router Agent's job) while a more capable model handles nuanced teaching explanations — without integrating a second AI company to get that range.

**Which specific model to start with:** We recommend starting Milestone 1 with **Claude Opus** (currently `claude-opus-4-8`), Anthropic's most capable currently-available model, applied to every agent uniformly. Simplicity outweighs cost optimization at this stage — one model, one set of behaviors to understand and tune, rather than juggling different models for different agents before there's any real usage data to justify the difference. Once MentorOS has real conversations to measure, cost/quality tradeoffs per agent (for example, a cheaper model for the Router Agent's simpler classification job, alongside the most capable model for the Concept Agent's actual teaching) become a data-informed decision rather than a guess — and that trade-off is explicitly a decision for you to make later with real numbers in hand, not something to lock in now.

**What we considered instead:** Other AI companies (OpenAI, Google) offer comparable capability. We're recommending Anthropic specifically for the reasons above (safety posture fit for a children's product, cost-efficient shared-context handling for a multi-agent design) — but this is a genuine choice point, not a technical requirement; switching providers later is possible without a full rebuild.

**When it's needed:** 🔵 Account and API key set up in M0 (low effort, so M1 can start immediately); real usage begins in M1.

---

## 7. File Storage — Where Uploaded Files Would Live

**Recommendation: Supabase Storage.**

**Why:** MentorOS doesn't need file storage for M0–M7 — there's no image upload, no audio file, nothing to store beyond structured data and text (which live in the database itself). We're naming the choice now purely because it's the same vendor already in use, meaning it costs nothing to "set up" — it already exists, waiting, the moment a future milestone needs it (voice recordings in M8, or a possible future "upload a textbook page" feature).

**When it's needed:** ⚪ Deferred — first realistic need is Milestone 8 (voice recordings). No setup action required now.

---

## 8. Deployment & Hosting — Where the Application Actually Runs

**Recommendation: Vercel.**

**Why:** Vercel is built specifically to run Next.js applications (the same company builds both), which means deployment is close to zero-configuration: connect the project's code repository, and every update is automatically built and published. Two features matter especially for MentorOS's early stage:

- **Preview deployments.** Every proposed change automatically gets its own temporary, shareable test version before it touches the real product — satisfying M0's "separate test and real environment" requirement essentially for free, with no extra setup.
- **A generous free tier** that comfortably covers development and an early pilot.

**What we considered instead:** Other hosting providers (Netlify, Railway, a self-managed cloud server) could all run a Next.js app. None pairs as tightly or as simply with this exact stack, and a self-managed server in particular would mean taking on operating-system maintenance and security patching — real, ongoing work with no product benefit at this stage.

**When it's needed:** 🟢 Required for M0.

---

## 9. Logging — Recording What Happened

**Recommendation: A structured "events" table inside the Supabase Postgres database.**

**Why:** Milestone 0's acceptance criteria require every request and response to be recorded with a timestamp and a shared trace ID — the foundation of the observability principles in [13_System_State_Model.md](13_System_State_Model.md) and [14_Event_Driven_Architecture.md](14_Event_Driven_Architecture.md). Because M0 has no real AI logic yet (just an echo reply), a simple database table recording each event — what happened, when, tied to which conversation — is sufficient and requires no new vendor. This table is also the seed of the "events as a substitute for a message broker" approach described in Decision 2 above: it grows into the system's replay and audit trail as later milestones add real agents.

**When it's needed:** 🟢 Required for M0.

---

## 10. Monitoring & Observability — Knowing When Something's Wrong

**Recommendation (reconciled — see Change Log): Sentry (from M0) for application errors, plus the in-product Observability Agent + AI Transparency Panel (shipped, M9 / post-M9 Phase 2) for real-time AI-quality visibility. Langfuse remains a proposed addition, not yet implemented, scoped to Phase 5's engineering-side evaluation platform.**

This section originally recommended Langfuse (from M1) as the AI-quality tracking tool, and explicitly called building custom dashboards from the raw events table "rejected for now." Neither happened as written: Langfuse was never integrated — no account, credentials, or code for it exist anywhere in this repository — and M9 built exactly the custom, events-table-based approach this section had called rejected. [15_Phase2_Roadmap.md](15_Phase2_Roadmap.md) surfaced this as an unresolved documentation conflict; the entry below is that reconciliation, split into what's actually shipped versus what's still only proposed.

**Shipped: Sentry, for application errors.** Unaffected by this reconciliation — a widely used, simple-to-add service that catches ordinary software crashes (a database connection failing, a page throwing an unexpected error), useful from the very first milestone, before there's any AI logic to worry about.

**Shipped: the Observability Agent + AI Transparency Panel, for in-product AI-quality visibility.** Two parts, built in two stages:
- The **Observability Agent** ([05_Agent_Architecture/14_Observability_Agent.md](05_Agent_Architecture/14_Observability_Agent.md)) is a read-only aggregation function (`getObservabilityReport()`) that reconstructs a per-turn execution trace — pipeline stage, latency, tokens, cost, safety/evaluation outcomes — from the existing `events` table. It shipped in M9 as a post-hoc report, not part of the request pipeline, and needs no external vendor.
- The **AI Transparency Panel** (post-M9, this doc's Phase 2) is the in-product UI built on top of that report: a collapsible panel in the chat screen (off by default for students), a per-message "View reasoning" action, and a standalone Architecture Explorer page for browsing recent traces — all reading `getObservabilityReport()` through a thin, auth-checked API route.

Together these are real-time, per-turn, in-product visibility — a student or teacher inspecting one conversation's trace right now, in the app. That is a different job from what Langfuse below is for.

**Proposed, not yet implemented: Langfuse, for engineering-side AI-quality monitoring.** Per the "run both" decision in [15_Phase2_Roadmap.md](15_Phase2_Roadmap.md), Langfuse (or an equivalent) remains scoped to Phase 5's evaluation platform — an offline regression harness, benchmark datasets, and AI-quality trend reports evaluated over time, for engineering/product use, not the in-app panel above. It maps onto the same "Observability State" fields in [13_System_State_Model.md](13_System_State_Model.md) — trace ID, latency, token usage, cost — but nothing beyond this documentation exists for it yet. Revisit once Phase 5 is actually scoped; there is no current dependency on it.

**When it's needed:** Sentry — 🟢 Required for M0 (shipped). Observability Agent / AI Transparency Panel — 🟢 Shipped (M9 / post-M9 Phase 2). Langfuse — ⚪ Proposed for Phase 5, not yet implemented.

---

## 11. Secrets Management — Keeping Passwords and API Keys Safe

**Recommendation: Vercel's built-in environment variables, plus a git-ignored local file for development.**

**Why:** "Secrets" here means things like the database password and the Anthropic API key — values that must never appear in the code itself or be visible to students. Vercel lets these be entered directly into its dashboard, encrypted, and automatically made available to the running application without ever appearing in the code repository. For working on the project locally (on a laptop, before anything is published), the same values live in a file conventionally named `.env.local`, which is explicitly excluded from being saved into the project's shared history.

A dedicated "secrets manager" product (like AWS Secrets Manager or HashiCorp Vault) exists for organizations managing hundreds of services and complex permission rules across teams — real infrastructure, but built for a scale and team size far beyond a solo builder's single application. Using one here would be adding a specialized tool to solve a problem that doesn't exist yet.

**The one non-negotiable rule:** the `.env.local` file must never be committed to the project's shared history. This is worth stating explicitly because it's the single most common way small projects accidentally leak credentials.

**When it's needed:** 🟢 Required for M0.

---

## 12. Local Development — Working on the Project Day to Day

**Recommendation: Two separate Supabase projects — one for development, one for production — with no local database installation required.**

**Why:** Normally, "local development" implies installing and running a copy of the database on your own laptop, which typically means learning a tool like Docker. For a solo builder without a software engineering background, we can skip that entirely: create a second, free Supabase project dedicated to development, and point the local copy of the application at it via the `.env.local` file described above. Working on the project day-to-day then just means running the application locally (a single command) while it talks to the real, hosted development database over the internet — with a low-stakes Anthropic API key (ideally with a small spending cap) attached for testing.

The production Supabase project — the one real students' data eventually lives in — is only ever touched by the deployed, published version of the application, never by day-to-day development work. This mirrors the "separate test and real environment" principle from M0's acceptance criteria at the data layer, not just the hosting layer.

**What we considered instead:** Running Postgres locally via Docker is the more traditional approach and gives slightly faster feedback loops, but requires learning Docker itself — a meaningful extra skill for no real benefit at this project's stage. This can be adopted later if local iteration speed ever becomes a genuine bottleneck.

**When it's needed:** 🟢 Required for M0 (both Supabase projects should exist before any coding begins).

---

# Full Stack Summary

| Category | Choice | Required From |
|---|---|---|
| Frontend | Next.js (React) + TypeScript | M0 |
| Backend | Server-side code within the same Next.js app | M0 |
| Database | Postgres (via Supabase) | M0 |
| Authentication | Supabase Auth | M0 |
| Vector Database | pgvector (within the same Supabase Postgres) | Set up M0 · used M1 |
| LLM Provider | Anthropic API (Claude Opus) | Set up M0 · used M1 |
| File Storage | Supabase Storage | Deferred (~M8) |
| Deployment & Hosting | Vercel | M0 |
| Logging | Events table in Supabase Postgres | M0 |
| Monitoring — errors | Sentry | M0 |
| Monitoring — AI quality (in-product) | Observability Agent + AI Transparency Panel | Shipped, M9 / post-M9 Phase 2 |
| Monitoring — AI quality (engineering-side) | Langfuse (proposed, not yet implemented) | Phase 5 |
| Secrets Management | Vercel environment variables + `.env.local` | M0 |
| Local Development | Second ("development") Supabase project | M0 |

---

# What This Architecture Deliberately Avoids (For Now)

Naming these explicitly so they're recognized as *deliberate choices*, not oversights, if a future contributor or AI assistant suggests them:

- **Microservices** (many small, independently deployed services) — one application is simpler to build, deploy, and reason about at this scale.
- **A message broker** (Kafka, SQS, or similar) — see Decision 2. The documented event-driven design is achieved via direct function calls plus an events table instead.
- **Kubernetes or any container orchestration platform** — Vercel's hosting model makes this entirely unnecessary.
- **A separate, dedicated vector database service** — pgvector inside Supabase is sufficient at current and near-term scale.
- **A dedicated secrets manager** (Vault, AWS Secrets Manager) — Vercel's built-in environment variables are sufficient for a single application.
- **Multiple LLM providers** — one provider (Anthropic) keeps integration, billing, and prompt-tuning work in one place.
- **A native mobile app** — the web application works on phones through a browser; a dedicated app is a future consideration, not a current one.
- **Any self-hosted infrastructure** (a company-owned server) — every choice above is a managed service, meaning no operating-system patching, no hardware failures to respond to, no server to keep awake at 2am.

---

# Evolution Path — Signals to Revisit These Choices

None of the above are meant to be permanent. Here's what would indicate it's time to reconsider a specific choice, so the decision is evidence-driven rather than anxiety-driven:

- **Split frontend and backend** when agent orchestration becomes heavy enough (background jobs, long-running processes) that it needs to scale independently from the chat screen — likely not before M6 or M7, if ever.
- **Introduce a real message broker** when MentorOS needs true parallel agent execution, independent retries, or multiple unrelated systems reacting to the same event — a signal that would emerge from real production pain, not from re-reading the architecture docs.
- **Move to a dedicated vector database** if the knowledge base grows to hundreds of thousands of content pieces across many subjects and pgvector search noticeably slows down — realistically an M9-or-later consideration.
- **Introduce per-agent model selection** (a cheaper/faster model for simple classification jobs like the Router Agent, the most capable model reserved for teaching) once real cost and quality data exists to make that trade-off deliberately, rather than guessing in advance.
- **Adopt a dedicated secrets manager** only if the team grows beyond a size where "who has access to which key" can be tracked informally.

---

# Environment Setup Checklist (Before Any Code Is Written)

A literal to-do list for the very start of Milestone 0:

- [ ] Create a GitHub repository for the project (source control — where the code's history lives)
- [ ] Create a Vercel account and connect it to the GitHub repository
- [ ] Create **two** Supabase projects: one named something like `mentoros-dev`, one `mentoros-production`
- [ ] Enable the `pgvector` extension on both Supabase projects (a checkbox in the Supabase dashboard — costs nothing to enable early)
- [ ] Create an Anthropic API account and generate an API key; consider setting a spending cap while testing
- [ ] Create a Sentry account and a new project for MentorOS
- [ ] Set up `.env.local` locally with development credentials, and confirm it is listed in `.gitignore`
- [ ] Enter the same credentials (pointed at the production Supabase project) into Vercel's environment variable settings
- [ ] Confirm a test deployment succeeds and a preview URL is generated for a sample change

Once this checklist is complete, Milestone 0's actual feature work (accounts, chat screen, safety filter, logging) can begin.

---

# Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-07-09 | Initial draft — full stack decided for M0, with forward notes through M9 |
| 1.1 | 2026-07-24 | B4 (Repository Hardening): reconciled §10's Langfuse recommendation with what actually shipped — Langfuse was never integrated; M9 built the custom Observability Agent this section had called "rejected," and post-M9 Phase 2 work added the in-product AI Transparency Panel on top of it. Langfuse is now documented as a proposed, not-yet-implemented Phase 5 (engineering-side) addition, per [15_Phase2_Roadmap.md](15_Phase2_Roadmap.md)'s "run both" decision. Documentation only — no code or credentials changed. |
