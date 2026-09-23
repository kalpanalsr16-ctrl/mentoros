# MentorOS Demo Readiness Audit

**Scope:** every page under `web/src/app` (33 routes), audited from a first-time-user perspective against 15 checklist items. **No code was changed.** This is a read-only static-code audit — there is no browser/screenshot tool available in this environment, so nothing was visually rendered. Every finding below is grounded in an actual file and line number; where a finding depends on real rendered behavior (wrapping, dark-mode contrast, scroll feel), it's explicitly marked **needs visual confirmation** rather than asserted.

Two of the highest-impact claims (the Sidebar bug and the logo-to-placeholder link) were independently re-verified directly against the source after the sub-audits reported them, not just taken on faith.

---

## P0 — Must fix before the demo

These are either guaranteed to be visible on the demo's actual click-path, or actively misleading/broken rather than merely unpolished.

1. **The Teacher Studio sidebar's "Studio" item is permanently highlighted, on every single Studio page.**
   `design-system/layouts/Sidebar/Sidebar.tsx:14-16`: `isActive` does `pathname.startsWith(href)`, and Dashboard's own `href` is `"/studio"` (`TeacherShell.tsx:16`) — a prefix of every other Studio route. Visiting Classes, Curriculum, Reports, or any deep-linked page either double-highlights "Studio" alongside the real section, or (for pages with no nav item — Lessons, Assessments, Homework, Misconceptions, Interventions, Evaluation, Assistant) highlights only "Studio" while the actual open section is never indicated. This is visible on every screen for the entire Teacher Studio portion of the demo.

2. **The MentorOS logo, clicked from anywhere in the signed-in app, goes to a "Coming soon." placeholder.**
   `design-system/layouts/Header/Header.tsx:16,42`: `Wordmark` defaults to `href="/"` and is rendered with no override by both `TeacherShell.tsx:35` and `MinimalShell.tsx:24` (used by Student, Parent, and Explorer). `app/page.tsx:17-19` is a literal, un-styled "Coming soon." stub. Clicking the logo — a completely natural executive reflex — from Teacher Studio, the Student Dashboard, the Parent Portal, or the Architecture Explorer lands on what looks like an unfinished product.

3. **Sign-in, Sign-up, and the `/chat` header are visually a different, unfinished-looking product.**
   None of the three uses the design system: `app/sign-in/page.tsx:95-107` and `app/sign-up/page.tsx:115-127` hardcode `#999`/`#171717`/`#fff`/`#b3261e` via inline styles instead of `var(--color-border)`/`var(--color-interactive)`/etc.; the submit button is flat near-black instead of the brand-indigo `Button` primitive used everywhere else; the heading font doesn't use `--font-fraunces`. `app/chat/page.tsx:101` hardcodes `borderBottom: "1px solid #ddd"`, and the shared `MessageInput.tsx` (used by **both** `/chat` and `/studio/assistant`) hardcodes the same off-palette colors, an 8px radius instead of the token's 10px, and has **zero dark-mode support** — if the theme toggle is used at any point in the demo, the message input on both AI-chat surfaces will stay light while everything around it goes dark. Sign-in is the literal first screen in the demo script's Act 2 ("Sign in as the student account"); chat is the centerpiece of Act 2 and Act 4.

4. **`/chat` and `/studio/assistant` have no `loading.tsx` — both will appear frozen on first load.**
   Neither route has a loading boundary, and both do a real server-side data fetch before rendering (conversation history / latest assistant conversation). Per Next.js's own loading-boundary semantics, a route with no local `loading.tsx` shows nothing at all until the fetch resolves — no skeleton, no spinner. These are the two AI-chat surfaces the demo script puts front and center (Act 2, Act 5); a slow fetch reads as "the app hung."

5. **A real, reproducible bug: the profile/settings "Saved" confirmation goes stale and can misrepresent the current form state.**
   `app/app/profile/ProfileForm.tsx` and `app/app/settings/SettingsForm.tsx`: `status` is set to `"saved"` after a successful save but is **never reset** when the user changes a field afterward — there's no `onChange` handler that clears it. Change a chip selection after saving, and "Saved." stays on screen even though the on-screen state no longer matches what's persisted. This is a correctness bug, not a style nit, and would be embarrassing if narrated live ("see, it saves instantly") right after an unrelated edit.

6. **The parent Approve/Reject action — the exact beat in Demo Script Act 6 — gives no visible confirmation.**
   `app/app/parent-requests/ParentRequestActions.tsx:16-27`: on success, the only thing that happens is `router.refresh()`; the request row simply moves between sections. The demo script narrates "Sign in as that student, go to `/app/parent-requests`, approve it" as a beat — with nothing on screen to mark the click as having worked, there's a real risk of an awkward pause ("did that do anything?") at a scripted moment.

7. **No global error boundary anywhere in the app — a real hiccup live would crash to Next.js's raw default error page.**
   Zero `error.tsx` files exist anywhere under `web/src/app` (confirmed by directory search). A transient network blip or a cold Supabase connection during the live demo would currently surface as an unstyled, generic crash screen rather than any on-brand message. This is a single cheap file (`app/error.tsx`, maybe `app/global-error.tsx`) as insurance — not a redesign, not new functionality, just a safety net.

---

## P1 — High-value polish (should fix if time allows, not blocking)

1. **Every Student `/app/*` subpage is a navigational dead end.** Achievements, Assessment, Practice, Profile, Progress, Revision, Roadmap, Settings, and Parent-requests all link out from the Dashboard, but none of them link back — the only way back is the browser's back button. This is a documented, deliberate "single-path" shell choice, not an oversight, but it will feel unpolished if the presenter needs to bounce between sections live.
2. **Evaluation Dashboard and Teacher Assistant have zero inbound links from anywhere in the app**, and the code comment on Evaluation's page (`app/studio/evaluation/page.tsx:21-23`) inaccurately claims it's "deep-link-only, same convention as Misconceptions/Analytics/Interventions" — Analytics **is** in the nav, and Misconceptions/Interventions **do** have real inbound links from Class Overview; Evaluation and Assistant have neither. The demo script already reaches both by typed URL, so this isn't blocking, but the comment should be corrected so it doesn't mislead whoever preps the next demo.
3. **No confirmation step before destructive actions**: revoking a parent's link (`RevokeLinkButton.tsx:23-31`) and removing a student from a class roster (`ManageRosterForm.tsx:47-61`) both fire immediately on click, unlike Delete Assessment/Delete Lesson, which both use `window.confirm(...)` first.
4. **Silent success after several other mutations** — creating a class, adding/removing a roster student — same pattern as #6 above (P0), just on actions not called out by name in the demo script, so lower urgency but the same fix.
5. **Missing `loading.tsx` on `/explorer` and `/onboarding`** — same category as the P0 chat/assistant finding, lower priority since Explorer's own refetch pattern (dim-to-60%-opacity) partially compensates, and onboarding likely isn't shown live (demo assumes pre-created accounts).
6. **`DeleteAssessmentButton`/`DeleteLessonButton` show no error message on a failed delete** — the spinner just clears and the row stays, with no explanation.
7. **Card-primitive drift**: `app/app/assessment/page.module.css` hand-rolls a byte-for-byte copy of `Card`'s CSS instead of importing it (its sibling, Practice, does import `Card` correctly); Curriculum Explorer's search results and filter controls (`CurriculumSearch.tsx`, `curriculum/page.tsx`) hand-roll buttons/rows instead of the shared `Button`/`Card` — worth a look since Curriculum Explorer is one of the newest, most-demoed screens.
8. **Inconsistent empty states**: Progress's empty state is missing the "Go to chat" CTA its three sibling pages (Achievements/Assessment/Practice) all have; the parent "Your requests" section has no empty state at all, while the student-side mirror of the same feature does.
9. **Several loading skeletons don't structurally match their real content** (Concept Detail, Lesson Detail, Assessment Detail, Parent Dashboard, Parent Child Detail) — expect a visible "pop"/layout shift when real content swaps in. *Needs visual confirmation* for how jarring this actually looks.
10. **Overflow risk on a handful of unwrapped flex rows** — Class Overview's header-links row, Student Overview's header row, Revision's card row, and the Parent children list row all lack `flex-wrap`/`min-width: 0` that their better-handled sibling rows (Assessment/Practice history, Roadmap) do have. *Needs visual confirmation* at a narrow viewport with a genuinely long name.
11. **No "forgot password" link on sign-in**, and an inconsistent password-length rule (6 characters at sign-up vs. 8 at account settings) — low likelihood of being hit live, but a real gap if a login issue comes up.
12. **Onboarding's Goals/Style steps allow "Continue" with zero selections**, unlike the Grade step, which correctly disables Continue until something's picked.
13. **Teacher Assistant's data fetch has no error-status handling at all** — a genuine backend failure would silently render as an empty "start typing" chat rather than any visible error, which could look like a false "all clear" during an actual hiccup.

---

## P2 — Future improvements (defer)

1. Analytics' and Evaluation's stat-grid breakpoints differ cosmetically (140px vs. 160px minmax) — invisible unless compared side by side.
2. Homework Generator's Print button (`window.print()`) has no dedicated print stylesheet — untested/unknown output, unlikely to come up live.
3. The same "misconception" data renders as a bordered Card on the Misconceptions page but as a plain list item on Student Overview — same concept, two visual treatments.
4. App-wide use of literal `"→"`/`"←"` text glyphs instead of icon components for directional affordances — cosmetically minor and consistent everywhere it appears; also, the shared icon set doesn't currently export a left-chevron at all.
5. `Header.module.css` hardcodes `0.875rem` twice instead of referencing the equivalent existing token — invisible, but worth a one-line cleanup someday.
6. `ManageRosterForm` requires pasting a raw student UUID with no name search. This is a **known, documented product decision** (no self-enrollment UI), not a bug — flagging only as a live-demo logistics note: don't attempt to add a student on the fly unless the ID is ready in advance.
7. Assessment Detail's and Lesson Detail's "not found" branches render without an `<h1>`, unlike their siblings (Class/Student/Concept Detail) — only visible if someone hits a bad ID live.
8. A third, inconsistent empty-state convention on Student Overview (hides the Misconceptions section entirely when empty, vs. showing explicit "nothing yet" text for Mastery/Assessments).

---

## What would need a real browser to confirm

Flagged individually above, collected here for visibility: actual wrapping/overflow behavior of long names at real widths; how visually jarring the loading-skeleton-to-real-content "pop" actually is; whether the hardcoded chat-input colors visibly clash in dark mode; what `window.print()` actually outputs; and the exact look of the double-highlighted sidebar. None of these change the triage above, but a quick pass in an actual browser (or asking me to spin up the dev server and describe what a screenshot would show, since I still can't see it myself) would firm up severity before the demo.

---

Waiting for your approval before any implementation begins, per the sprint's ground rules — no fixes, no refactors, no behavior changes until you sign off on this list (and on which bucket, if any, should move).
