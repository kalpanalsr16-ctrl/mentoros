# State Management

**No Redux, and no other global state library, is justified anywhere in this architecture.** MentorOS's UI is a set of mostly-independent screens (Student/Teacher/Parent surfaces barely share live state at all — they share *components*, per `08_Component_Ownership.md`, not state) plus one moderately complex screen (Chat). That shape doesn't need a global store; it needs a clear split of six distinct kinds of state, each handled by the simplest tool that actually fits it.

---

## 1. Server State
**What:** anything that lives in Postgres and is fetched via `10_API_Contracts.md`'s endpoints — mastery, roadmap, class rosters, everything.
**Approach:** a data-fetching library (SWR or React Query — either is a reasonable, standard choice; naming both rather than picking one, since the choice itself is a small new-dependency decision requiring the same sign-off pattern established in the Design System, not assumed here) providing cache, revalidation, and loading/error state together — not raw `useEffect`/`fetch` scattered per component, which is what `ChatShell` does today and which this architecture deliberately doesn't propagate to 25+ new screens.
**Rule:** every `GET` endpoint in `10_API_Contracts.md` is a server-state query; every `POST`/`PATCH`/`PUT` is a mutation that invalidates its related query on success (e.g. saving Profile invalidates the dashboard's mastery snapshot query).

## 2. UI State
**What:** panel open/closed (AI Transparency panel), selected tab (Curriculum Explorer), form field values before submission, hover/focus states.
**Approach:** plain React `useState`/`useReducer`, local to the component that owns it. No context, no store — this is exactly what React already does well, and introducing anything more is unjustified complexity for state that never needs to be read outside its own component tree.

## 3. Session State
**What:** who's signed in, their role, their auth token.
**Approach:** already solved, unchanged — Supabase's existing session handling (`@supabase/ssr`, `web/src/lib/supabase/`) via cookies, exactly as `/api/chat` already relies on. The only addition this architecture needs is reading `profiles.role` (proposed, `03_Teacher_Studio.md`) alongside the existing claims check, to route a signed-in user to `/app`, `/studio`, or `/parent` — not a new session mechanism.

## 4. Streaming State
**What:** the token-by-token text arriving during a chat response (`05_Chat_Experience.md`'s streaming requirement).
**Approach:** local to the Chat screen, a dedicated `useReducer` (append-token action, complete action, error action) — not server state (it's not cacheable/revalidatable in the SWR/React Query sense, it's a one-time stream) and not global UI state (nothing outside the active message needs it). This is a small, self-contained piece of state that shouldn't be over-architected.

## 5. Voice State
**What:** recording/listening/speaking status, once Voice exists (Phase 7).
**Approach:** **not designed in this document** — named as its own state category because voice genuinely needs one (microphone permission, recording buffer, transcription-in-progress, playback state are all real, distinct states a text-only chat doesn't have), but designing it now, before a vendor/API decision exists (`15_Phase2_Roadmap.md`'s own flag on Voice's uncertainty), would be speculative. `12_Future_Extensibility.md` names the extension point; this document doesn't fill it in early.

## 6. Agent Transparency State
**What:** the AI Transparency panel's data (`07_AI_Transparency_Panel.md`) — which trace is being viewed, expanded/collapsed node state.
**Approach:** the *data* (the `ObservabilityReport` itself) is Server State (§1) — fetched via `GET /api/observability/trace/:traceId`, cached like any other query. The *UI* (which nodes are expanded) is UI State (§2), local to the panel component. No new state category is actually needed here beyond composing the two already defined — named separately in the brief because it's a distinct *feature*, not because it needs a distinct *mechanism*.

---

## Summary table

| State kind | Lives in | Shared across components? |
|---|---|---|
| Server State | SWR/React Query cache | Yes — that's the point of a cache |
| UI State | Local `useState`/`useReducer` | No |
| Session State | Supabase cookies (existing) | Yes, via existing `createClient()` pattern |
| Streaming State | Local `useReducer` (Chat screen only) | No |
| Voice State | Not designed yet | — |
| Agent Transparency State | Server State + local UI State (composed) | Partially (data yes, expand/collapse no) |

No screen in `02`–`06` needs state that doesn't fit one of the six categories above — checked explicitly while writing those documents, not assumed.
