# Future Extensibility

Where features not designed in this phase plug in — named precisely enough that this architecture doesn't need reshaping when they arrive, without designing any of them now.

---

## Voice (Phase 7)
**Plugs in at:** `MessageInput`'s microphone icon and a chat-header mode toggle (`05_Chat_Experience.md`), plus a new Voice State category already reserved (`11_State_Management.md` §5). **Does not** plug into the agent pipeline itself — voice is a client-side input/output modality around the existing `/api/chat` contract, not a new agent. The one real open question (named, not answered): whether transcription happens client-side before hitting `/api/chat` (keeping the API contract identical) or server-side (needing a new endpoint) — a vendor-dependent decision for Phase 7 itself.

## Avatar (Phase 7)
**Plugs in at:** an `AvatarSurface` seam near the chat header and Student Dashboard's greeting element (`02_Student_Experience.md`), designed in the Design System as an *abstraction*, not a committed visual (`docs/design-system/01-Architecture-Design.md` §2.4 — explicitly not a mascot/character system). No layout reservation is needed now; this is additive whenever it arrives.

## Learning Commons (Phase 4/6)
**Already substantially designed**, not purely a future extension point — `03_Teacher_Studio.md`'s `CurriculumProvider` abstraction and `01_Application_Map.md`'s `/studio/integrations/learning-commons` screen are real, specified surfaces. What remains genuinely future: additional data categories (Learning Commons' own roadmap may expand beyond Standards/Components/Progressions/Curriculum) and the standards-crosswalk work flagged in `15_Phase2_Roadmap.md` (no automatic alignment between Learning Commons' US-standards data and MentorOS's own NCERT curriculum today).

## MCP (Phase 6)
**Plugs in at:** two distinct points, per `15_Phase2_Roadmap.md` §8's original scoping, both still valid: (1) `LearningCommonsMcpCurriculumProvider` (`03_Teacher_Studio.md`) — MentorOS as an MCP *client*, consuming Learning Commons' MCP server; (2) a future MentorOS-as-MCP-*server* direction (exposing mastery/progress lookups to external MCP-aware clients) — named in the original roadmap, not designed at the UI layer in this document since it has no MentorOS-side screen, only an API surface, which would belong in a future `10_API_Contracts.md` amendment.

## Evaluation Harness (Phase 5)
**Plugs in at:** the Evaluation Dashboard (`06_Dashboard_Architecture.md`), already fully speced as a shell waiting for Phase 5's regression-detection data. The harness/benchmark-dataset/regression-framework engineering itself is backend/tooling work with no new UI beyond that dashboard — this document's job (giving it a home) is done; the harness's own design is Phase 5's.

## Architecture Explorer — deeper capabilities
**Already built as a real page** (`01_Application_Map.md`, `06_Dashboard_Architecture.md`, reusing `07_AI_Transparency_Panel.md`'s design at full scale). Future extension, not designed now: a **showcase/demo mode** — a read-only, no-auth-required variant of this exact page, seeded with representative (anonymized or synthetic) traces, reachable via a direct link for external reviewers (`../showcase/SHOWCASE.md`'s intended audience) without requiring them to create a MentorOS account. Named because it's a natural, low-risk extension of a page that already exists, not because it's designed here.

## Offline Mode
**Not designed — extension point named only.** Would plug in as a service-worker layer (PWA manifest, Cache API) sitting outside the current Next.js SSR/API request model entirely — caching the Learning Roadmap's curriculum data (small, largely static) and queueing chat messages sent while offline for later delivery. This is a meaningfully different architecture layer than anything else in this document (a service worker, not a React state/API concern), flagged as its own future initiative requiring its own dedicated design pass, not sized or scoped here.

## Multiple LLM providers
**Not designed — and deliberately not designed as a simple extension point**, unlike `CurriculumProvider` above. Today, `web/src/lib/llm/client.ts` calls Anthropic's SDK directly inside every agent function — there is no injected-provider seam analogous to `KnowledgeProvider`/`LearnerStateProvider` for the LLM call itself (the injected-function *seam* every agent uses, e.g. `explainConcept(context, generate)`, injects a *specific* Claude-calling function, not a provider-agnostic interface). Introducing a genuine multi-provider abstraction would mean touching `lib/llm/client.ts` and, by extension, every agent's call site — a real, explicit change to the completed M0–M9 architecture, not a UI-layer addition. Named here so it isn't confused with `CurriculumProvider`'s much lighter-weight pattern; any future work here needs its own architecture review and product-owner sign-off, the same way Learning Commons' `CurriculumProvider` got one.

## Administrator role/console
**Not designed — extension point named only**, closing the thread left open in `01`, `06`, and `09`. Would plug in as a fourth value in `profiles.role` (`'admin'`), a `/admin` namespace matching the app-shell template (`docs/design-system/04-UX-Design-Experiences.md` §10), and read access across every teacher/parent/student surface already built — meaning it's structurally the *cheapest* future role to add, since it mostly reuses Teacher Studio's existing components at a higher permission tier rather than needing new ones. Not built now because no concrete admin use case has been named by the product owner yet, and inventing one would violate this document's own principle (§00, "flag what's genuinely undecided" rather than assume).
