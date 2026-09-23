# MentorOS — Public Repository Audit

Repo: `github.com/kalpanalsr16-ctrl/mentoros` (confirmed **public** via `gh repo view`). Audited at commit `853d774`, 98 commits, 607 tracked files, ~18.5K LOC in `web/src`. Read-only review — nothing was modified.

---

## PART 1 — Security Audit

**Methodology:** `git grep` across every tracked file for the current tree, plus `git log --all -p` across full history (not just the current branch tip) for each pattern below. Both passes, not just the working tree, since a secret committed and later deleted is still recoverable from history.

| Checked for | Tracked tree | Full git history | Result |
|---|---|---|---|
| `.env` / `.env.local` / `.env.production` files | — | — | Only `web/.env.local.example` is tracked, ever. **Clean.** |
| Anthropic API keys (`sk-ant-...`) | 0 matches | 0 matches | **Clean.** |
| Supabase service-role/secret keys (`sb_secret_...`) | 0 matches | 0 matches | **Clean.** |
| JWT-shaped tokens (`eyJ...`, catches Supabase anon/service keys) | 0 matches | 0 matches | **Clean.** |
| Postgres connection strings with embedded credentials | 0 matches | 0 matches | **Clean.** |
| AWS keys (`AKIA...`) | 0 matches | — | **Clean.** |
| GitHub/Vercel tokens (`ghp_`, `gho_`, `vercel_`) | 0 matches | — | **Clean.** |
| Demo account credentials (`MentorDemo@2026`, `priya.sharma@mentoros.demo`) | 0 matches | 0 matches | **Clean** — also checked the 4 new docs from this session before recommending they be committed. |
| Personal emails (gmail/yahoo/hotmail patterns) | 0 matches | — | **Clean.** |
| Private IP ranges (10.x, 192.168.x, 172.16–31.x) | 0 matches | — | **Clean.** |
| Hardcoded Supabase project ref / URL | 0 matches | — | **Clean.** |
| Generic `password =`/`secret =`/`apiKey =` literal assignments | 0 matches (after excluding `process.env.*`, Zod schemas, examples) | — | **Clean.** |

**`.gitignore` review:**
- Root `.gitignore`: ignores `.env`, `.env.local`, `.env.*.local`. Correct.
- `web/.gitignore`: ignores `.env*`, explicitly un-ignores `.env*.example`. Correct — this is the right pattern (deny-by-default, allow the template back in).
- `web/.env.local.example` exists and contains **only comments and blank `KEY=` placeholders** — no real values leaked into the template itself. Confirmed by reading the file directly.

**No findings to report in file/line/severity format** — there is nothing dangerous to point at. I want to be explicit rather than manufacture filler: **zero secrets, zero credentials, zero sensitive data found**, in the current tree or in reachable git history.

**Limitation, stated explicitly per your instruction:** I can only search history reachable from local refs (`git log --all` covers every branch and tag your local clone knows about). I cannot check GitHub's server-side secret-scanning alerts, and I cannot see commits that were force-pushed away and are no longer reachable from any ref, if any ever existed. Within what's checkable, the result is clean.

One non-secret item worth a mention, not a finding: two docs (`docs/milestones/M0_Completion.md`, `docs/implementation/M0-10-Staging-Deployment.md`) reference old `*.vercel.app` preview/production deployment URLs. These aren't secrets — Vercel URLs aren't credentials, and that same doc explicitly records the decision to disable Vercel's SSO wall on production for product reasons (students have no Vercel accounts). No action needed.

---

## PART 2 — Repository Quality (recruiter / engineering-manager lens)

**What's genuinely strong, stated first because it's true and because a fair review cuts both ways:**
- Zero `TODO`/`FIXME`/`XXX` and zero stray `console.log` anywhere in 18.5K lines of `web/src` — unusually clean for a project this size.
- 9 Architecture Decision Records (`docs/adr/`), 6 sequence diagrams (`docs/diagrams/`), a dedicated API reference (`docs/api/README.md`), and a per-agent spec folder (`05_Agent_Architecture/`, 14 agent docs + template + diagram).
- Git history: 98 commits, consistent Conventional Commits style (`feat(...)`, `fix(...)`), scoped and descriptive — reads like real engineering discipline, not squashed noise.
- CI (`typecheck`, `lint`, `test`, `build`) on every push and PR, actually green.
- No `node_modules`, no build artifacts, no accidental binary bloat tracked.

**Findings, ranked by how much they'd cost you in a 5-minute skim:**

1. **`10_Observability.md` is tracked and completely empty (0 bytes).** Given "Observability" is a headline part of your own architecture narrative, a blank file with that exact name is the kind of thing a technical reviewer notices immediately and reads as unfinished, even though the actual content lives elsewhere (`14_Observability_Agent.md`, `docs/implementation/M9-02-Observability-Agent.md`). **Fix:** either fill it in or delete it — an empty placeholder is worse than no file.
2. **Four of your most substantive recent documents are not committed at all.** `docs/evaluation-strategy-report.md`, `docs/demo-readiness-audit.md`, `docs/demo-readiness-final-checklist.md`, `docs/demo-navigation-guide.md` all exist only on local disk (`git status` shows them as `??`). The public repo, right now, does not contain the one document (`evaluation-strategy-report.md`) that most directly demonstrates AI-evaluation thinking. **This is the single highest-leverage, zero-risk fix available to you** — I confirmed none of the four contain secrets or the live demo password, so committing them costs nothing.
3. **Two parallel documentation structures**: 16 numbered docs (`00_`–`15_`) live in the repo root, alongside a separate `docs/` folder with 8 more subdirectories. Your README's own "Documentation map" table does explain the split, so it's not fatal — but an outside reviewer who doesn't read that table first (many won't, in a 5-minute skim) will find the split disorienting. Consider at least a one-line note at the very top of the repo (or a root-level `docs/README.md` index) pointing both ways.
4. **`docs/milestones/` stops at `M5_Completion.md`**, while the project actually reached M9 and well beyond (confirmed via `CHANGELOG.md` and `docs/implementation/`, which *does* have M6–M9 docs). The milestone-summary folder specifically wasn't kept current — selective staleness, not total.
5. **`CHANGELOG.md`'s narrative stops at the "Production Verification Sweep"** (~M9-era). Roughly 15–20 commits since then — Sprint 2–4 (streaming chat, Transparency Panel, onboarding), the Curriculum Explorer, the full Demo Readiness Sprint, and the Router Agent correctness fix — are in `git log` but not in `CHANGELOG.md`. A reader relying on the changelog gets a materially incomplete picture of how much is actually built.
6. **`web/README.md`'s own "Structure" section is stale**, still describing "Sprint 1... placeholder page content until later sprints are built" — directly contradicted by the root `README.md`'s accurate "this is a complete product surface across three roles" framing. Two READMEs in the same repo disagreeing with each other is a concrete inconsistency a careful reader will catch.
7. **No `LICENSE` file.** Standard portfolio/OSS hygiene checklist item; its absence is the kind of small thing that quietly costs confidence with no offsetting benefit.
8. **`package.json` is unpolished**: `"name": "web"` (generic, not "mentoros"), no `"description"`, no `"license"`, no `"author"`. Costs nothing to fix.
9. **Zero product screenshots exist anywhere in the tracked repo.** The only tracked images in `web/public/` are the five default `create-next-app` boilerplate SVGs (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`) — confirmed unreferenced anywhere in `src/`, i.e., genuinely dead files left over from scaffolding. Both a "clean up dead files" finding and a "no visual proof of the product" finding at once.
10. Not a repo issue, but worth knowing: `Assets/`, `Examples/`, and `Screenshots/` exist locally but were **never tracked** (git doesn't track empty dirs, and `Screenshots/` was explicitly excluded per your own earlier instruction). None of this appears on the public GitHub repo — no action needed there.

---

## PART 3 — Product Manager Portfolio Review

Read as: Senior/Principal PM (AI), Amazon SPM, Google/Microsoft PM.

**What immediately impresses:**
- **This is a genuine multi-agent system, and the repo proves it rather than asserting it.** Safety → Router → Planning → Personalization → Concept/Practice/Assessment → Memory → Evaluation, each with its own spec (`05_Agent_Architecture/`, one file per agent: purpose, inputs, outputs, state, dependencies, success criteria). Most "AI product" portfolios describe a wrapped prompt; this one shows the actual decomposition.
- **The Evaluation Agent's safety-as-ceiling scoring** (`min(safety, 39)` when a response is judged unsafe, rather than averaging safety in with other dimensions) is a specific, defensible design decision that shows real understanding that AI quality isn't a single blended number — a safety failure should dominate the score, not get diluted by good clarity/accuracy elsewhere.
- **The AI Transparency Panel + Architecture Explorer + Observability Agent triad** — insisting every pipeline run be inspectable by students, teachers, *and* technical reviewers, reconstructed read-only from an event log rather than live-coupled to the request — is a genuinely differentiated product decision. Most portfolios don't build the "make the black box inspectable" feature at all, let alone as three separate, deliberately-scoped pieces.
- **9 ADRs** — documents *why*, with tradeoffs, not just *what*. Directly answers "can you defend an architectural decision under questioning."
- **Real multi-stakeholder RLS**: three roles (Student/Teacher/Parent) with genuinely different data-visibility rules enforced at the database layer, not just in route handlers — a parent has zero access until explicitly approved by the student; a teacher only ever sees their own roster. This is platform thinking, not "a chat app with a login screen."
- **The Router Agent bug fix is a strong, concrete "understands AI systems" artifact** — root-caused a live confidence-threshold bug (conflating category-confidence with request-completeness) precisely enough to fix it without loosening the global safety/clarification threshold. Visible in git log as a dedicated, well-scoped commit.

**What's missing:**
- **Zero visual proof of the product anywhere in the repo.** No screenshots, no demo GIF, no recorded walkthrough link. For a PM portfolio specifically, this is the largest single gap — a hiring manager giving you 5 minutes needs to *see* the product, not only read prose about it.
- **The one document that most directly answers "do you understand AI evaluation at a systems level"** — `evaluation-strategy-report.md` — **isn't in the public repo** (see Part 2, #2). Right now it doesn't exist as far as any reviewer can tell.
- **No outcome/impact metrics, even illustrative ones.** Understandable with no real users yet, but even a short "what 'good' looks like once live" table (target safety-clean rate, target hallucination-risk rate, etc.) would show outcome-oriented thinking layered on top of the architecture thinking that's already there.
- **No retrospective / "lessons learned" doc.** A PM portfolio benefits disproportionately from an explicit "what I'd do differently" — right now that thinking is scattered informally across CHANGELOG entries and ADRs rather than stated once, directly.
- **The roadmap docs exist but are invisible from the README.** `08_Roadmap.md` and `15_Phase2_Roadmap.md` are real, substantial documents that aren't linked anywhere in the README's own documentation map table.

**What would increase recruiter confidence, ranked:**
1. Commit the 4 pending docs (zero cost, immediate gain — directly closes the evaluation-thinking gap above).
2. Add 3–5 real screenshots and one short demo GIF/Loom link, high in the README.
3. Add a short, explicit "Lessons Learned" section.
4. Link the roadmap docs from the README's documentation table.
5. Bring `CHANGELOG.md`/`docs/milestones/` current, or explicitly redirect readers to `git log` for anything past the foundation phase.

---

## PART 4 — README Improvements (ranked by impact, not a rewrite)

1. **[Highest] Add screenshots + a short demo GIF/Loom, placed right after the opening paragraph.** Currently zero visual proof exists anywhere in the README or repo.
2. **[High] Fix the stale test count.** `npm test # 167 assertions` (line 66) is now 203 — an interviewer who actually clones and runs it will notice the mismatch immediately, and a wrong number in the one place that's trivially verifiable quietly undercuts trust in every other claim.
3. **[High] Add one crisp "Problem statement" paragraph before "What's actually built."** The README currently opens straight into product/architecture description; a PM reader specifically wants "what pain, for whom" stated plainly first.
4. **[Medium] Link `08_Roadmap.md` / `15_Phase2_Roadmap.md`** ("Future roadmap") into the Documentation map table — currently absent entirely.
5. **[Medium] Surface `docs/adr/` earlier and more prominently.** Currently mentioned once, in the middle of the "pipeline made visible" section — easy to skim past. ADRs are one of your strongest assets; they deserve their own line near the top.
6. **[Medium] Embed one System Design diagram directly in the README** (a rendered image, or an inline Mermaid block — GitHub renders Mermaid natively in `.md` files) rather than requiring a click-through to `docs/diagrams/`. First-glance architecture comprehension matters most in a 5-minute skim.
7. **[Low] Add a short "Lessons learned" section** (see Part 3).
8. **[Low] Fix `package.json`'s generic name/missing description/license.**
9. **[Low] Surface `docs/demo-script.md` near "Getting started,"** not only in the documentation map further down — that's the moment a reader is most likely to want a guided walkthrough.

Not recommending a rewrite — the README's actual writing (tone, honesty about scoped-out items, the "What's actually built" section) is already strong. These are additions and corrections, not a rework.

---

## PART 5 — Resume Readiness

**READY AFTER SMALL FIXES.**

Every blocker below is a documentation/commit action, not a code change, and none carries any risk:

1. **Commit the 4 untracked docs** — `evaluation-strategy-report.md`, `demo-readiness-audit.md`, `demo-readiness-final-checklist.md`, `demo-navigation-guide.md`. Confirmed secret-free; this is pure upside.
2. **Fix or remove the empty `10_Observability.md`.**
3. **Fix the stale `167` → `203` test count in the root README.**
4. **Add at least 2–3 real screenshots** — even a quick, unpolished set beats zero.
5. **Add a `LICENSE` file** (MIT is the conventional default for a portfolio repo unless you have a specific reason otherwise).
6. **Reconcile the two READMEs** — update `web/README.md`'s "Structure" section so it doesn't describe a Sprint-1 skeleton state that no longer exists.

None of these require touching application code, the database, or production. All are achievable in under an hour.

---

## PART 6 — Scores (out of 10)

| Dimension | Score | Why |
|---|---|---|
| Security | **9/10** | Confirmed clean across tracked tree and full history; correct `.gitignore`; real `.env.example`. Not a 10 only because I can't verify GitHub's server-side scan or fully-unreachable history, and there's no explicit secret-scanning CI step to keep it clean going forward. |
| Documentation | **7/10** | Genuinely extensive (81 markdown files, ADRs, diagrams, API reference) but unevenly maintained — CHANGELOG and milestones lag well behind actual progress, two READMEs disagree with each other, and the strongest recent doc isn't even committed. |
| Engineering Quality | **8/10** | Clean codebase (zero TODO/console.log across 18.5K LOC), real CI, RLS-enforced security model, disciplined commit history. Docked for the stale-doc/dead-file issues above, which are real if minor engineering-hygiene misses. |
| Architecture | **9/10** | A real, specified, multi-agent pipeline with per-agent docs, ADRs justifying tradeoffs, and database-enforced multi-role security. This is the repo's strongest dimension. |
| Product Thinking | **8/10** | Three distinct roles with genuinely different needs met differently (not reskinned), a transparency/observability feature most competitors wouldn't build, explicit non-goals stated honestly (Learning Commons, voice mode deferred with reasons). Docked for the missing outcome-metrics framing and no retrospective doc. |
| Portfolio Value | **6/10**, would be 8–9/10 after the Part 5 fixes | The substance is there; what's visible right now undersells it — no screenshots, the best evaluation doc missing, stale numbers a reviewer would catch in minutes. |
| Recruiter Impression (5-minute skim) | **6/10** today | Text-only, no visual hook, and the first files a skimmer opens (`10_Observability.md`, `CHANGELOG.md`, `web/README.md`) are exactly the three with the staleness/emptiness issues above. Fixable to 8+/10 with the Part 5 list. |
| **Overall** | **7.5/10** | A substantively strong, real system let down by presentation-layer gaps that are all inexpensive to close. The engineering and architecture are ahead of the packaging. |
