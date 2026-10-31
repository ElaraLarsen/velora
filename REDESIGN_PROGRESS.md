# Velora (formerly Handwave) metal redesign — progress

Branch `redesign/metal` (local only: no remote, nothing pushed or deployed).

| Phase | What | Commit | Status |
|---|---|---|---|
| 0 | Baseline: Git safety review, tests, build, screenshots | `bff3f73` | Completed and committed |
| 1 | Obsidian Titanium colour tokens, sapphire focus, deck typefaces | `84d49e0` | Completed and committed |
| 2 | Per-step metal finishes on cards, panels, tiles and rows | `3d98909` | Completed and committed |
| 3 | Metallic hero artwork behind each step | `ad35e23` | Completed and committed (approved 29 Oct 2026) |
| 4 | Remaining visual polish (seven approved items) | `005d50a` | Completed and committed (approved 29 Oct 2026) |
| 5 | Velora rebrand: resolve the uncommitted rebrand | `95d574c` | Completed and committed (approved 31 Oct 2026) |
| 6 | Project store foundation (no visible change) | not committed (starts from `95d574c`) | Approved; not yet committed |
| 7 | Studio Mode + Hackathon Mode | not committed (builds on the uncommitted Phase 6) | **Awaiting your review** |
| 7.1 | Submission-night additions: Planner, Submission, Rubric, guided tour, UX fixes | not committed (builds on Phase 7) | **Awaiting your review** |
| 7.2 | Hackathon materials, Stage 1: a metal and sculpture per section | not committed (builds on Phase 7.1) | **Awaiting your review** |
| 8 | Mode identity, Velora Focus, deadline clocks, deploy readiness | not committed (builds on Phase 7.2) | **Awaiting your review** |

## Phase 8 — mode identity, Velora Focus, deadlines, deploy readiness (31 Oct 2026)

- **Header identity:**
  - The taglines are "Understand · Inspect · Verify · Improve" in Studio and "Ideate · Plan · Build
    · Present · Ship" in Hackathon.
  - They cross-fade in one grid cell, so the header doesn't move (69 px; 65 px on phones). On phones
    the tagline sits under the mode switch.
- **Mode transition:**
  - Content fades in for 220 ms after a deliberate switch, never on load.
  - A screen reader announces the new mode.
- **Sound:** an optional two-note Web Audio tone (about 260 ms). It's off by default, has a speaker
  button, and plays only on a click of the mode switch.
- **Velora Focus** (clock button in the header):
  - Pomodoro, short break and long break, with start, pause, resume, reset and custom durations. A
    long break is offered after four Pomodoros.
  - The timer is computed from its end time, so it is correct in background tabs and after a refresh.
  - Only sessions that run to the end are recorded.
  - It shows statistics, a 7-day chart and history, plus Studio project activity or Hackathon
    competition figures.
- **Deadlines:**
  - The official deadline, my deadline and an optional competition start are edited independently.
  - Four-unit clocks (days, hours, minutes, seconds) show DEADLINE REACHED and never go negative.
  - They appear in the Planner, Submission and Focus.
- **Persistence** (`src/storage/local.ts`, validated, fails safe): focus data, sound preference and
  the three dates are kept in this browser. Files, claims, evidence, tasks and the checklist stay in
  memory as before.
- **Deploy readiness** in Submission: detection only, no deployment. See
  `docs/DEPLOYMENT_ARCHITECTURE.md`.

Checks:
- Typecheck passed. Tests: 168/168 (146 before, plus 22). Build passed; JS is 552 kB, over Vite's
  500 kB advisory, and up from 506 kB because the browser now uses zod for stored-data validation.
- Contrast: 3159/3159.
- Studio A/B against Phase 7.2: at 1440×900 and 1024×768 the page body is pixel-identical and only
  the header differs. At 375 px the content moves down 23 px for the tagline row, with identical text.
- Browser QA at all three widths: 0 console errors, 0 failed requests and 0 overflow. Covered:
  focus timer, deadlines, persistence after reload, corrupt storage, keyboard, focus trap and
  reduced motion.


## Phase 7.2 — Hackathon materials, Stage 1 (31 Oct 2026)

Implements the surfaces and sculptures from `docs/HACKATHON_MATERIALS.md`. Stages 2 (mode transition
and sound) and 3 (per-page compositions) and Pitch Studio's Rose Gold are not started.

- `src/materials.css`: seven new material blocks (graphite, titanium, copper, pearl, violet, glacier,
  tungsten) and their nav dots. Studio's five blocks and the status colours are unchanged.
- `src/artwork/materials.ts`, `src/artwork/liquid.ts`: seven sculpture entries; shader forms 7–12
  added to `shape` and `relief`, one oxide-tint branch for form 8, and a wide-screen offset for
  form 6. Studio's forms 1–5 are unchanged.
- `src/artwork/artwork.css`: a CSS fallback for each new material.
- `src/hackathon/HackathonView.tsx`: `SECTION_MATERIAL` and a metal dot per section in the nav.
  `src/App.tsx` picks the material from the current section in Hackathon Mode.

Checks: typecheck passed; tests 146/146; build passed (JS 506 kB, over Vite's 500 kB advisory);
contrast 3159/3159 pairs pass. Studio at 1440, 1024 and 375 px: text and geometry identical to before;
pixels identical except capture noise in the Load and Explain sculptures at 375 px, which is the
same between two runs of unchanged code. Hackathon sections: correct material each, no overflow,
no console errors, at all three widths. On phones the sculptures appear as a corner accent behind the
mode switch, the same framing as Studio's.

## Phase 7.1 — submission-night additions (31 Oct 2026)

Added on request before the submission deadline. Everything stays in the same in-memory project store;
nothing is persisted, sent anywhere or shared between devices.

| Change | Files |
|---|---|
| Planner: official submission deadline (entered by the user, read in the browser's time zone, shown with UTC), live countdown, tasks with Not started / In progress / Completed, own deadlines, edit and delete, milestones, Solo/Team with members and owners, overdue / due-today / after-submission markers, progress overall and per member, by-milestone and calendar views, in-app reminders on every Hackathon section | `src/hackathon/Planner.tsx`, `src/hackathon/analysis/planner.ts` |
| Submission: configurable deliverables checklist (nine defaults, removable, custom items, link or note per item), readiness summary, time left | `src/hackathon/Guardian.tsx`, `src/hackathon/analysis/guardian.ts` |
| Rubric: criteria, weights that must total 100%, 0–10 self-scores, weighted points, estimated total, weak areas, suggestions grounded only in verified claims, the checklist and the plan; labelled as the user's estimate, never a judge score | `src/hackathon/Rubric.tsx`, `src/hackathon/analysis/rubric.ts` |
| Report: adds a "Plan and submission" section, labelled as user-entered; the report now opens without files | `src/hackathon/analysis/report.ts`, `src/hackathon/HackathonView.tsx` |
| Guided tour: 16 short stops through both modes, all five Studio steps and all eight Hackathon sections; skip, back, restart, Escape; reopened from the compass button; first-visit invitation (in the page on phones, floating on wider screens) | `src/tour/Tour.tsx`, `src/App.tsx` |
| Store: `planner`, `checklist`, `rubric` and three updater actions; kept across mode switches, file changes and restart | `src/project/types.ts`, `src/project/reducer.ts` |
| UX fixes: "Downloaded" feedback on the report button; the browser asks before a refresh or close discards a loaded project; the Hackathon empty state explains each section and points to the sample and to planning | `src/hackathon/Report.tsx`, `src/App.tsx`, `src/hackathon/HackathonView.tsx` |

Checks: typecheck passed; 146 of 146 tests passed (127 earlier plus 19 in `tests/planning.test.ts`); build passed
(JS 501 kB, just over Vite's 500 kB advisory). Browser runs in demo mode at 1440, 1024 and 375 px: tour, planner,
checklist, rubric, report and the original Studio → Hackathon walkthrough, with no console errors, failed requests or
horizontal overflow.

Limitations: reminders work only while Velora is open in the tab (no system notifications); team names are local
names, not accounts; refreshing discards everything; the rubric's suggestions match criterion names by keyword.

## Phase 7 — Studio Mode + Hackathon Mode (31 Oct 2026)

Builds on the Phase 6 store, which is approved but not yet committed. A copy of the eight Phase 6
files was kept before Phase 7 began, so Phase 6 can still be committed on its own.

A Studio | Hackathon switch in the header (its own full-width row on phones). Both modes work on
the one shared project: switching changes only `project.view` (mode and Hackathon section), never the
files, context, claims, verdicts, findings or Studio's step and progress. No page reload.

Hackathon Mode has five sections, each computed in the browser from the shared project. No new API,
no AI call, no new dependency; nothing is uploaded or verified twice:
- Readiness: completeness, documentation among the uploaded files, unverified claims, evidence
  gaps, demo checklist.
- Tech stack: languages, frameworks, services, data tools and environment variable names from file
  types, imports, package manifests and a few code patterns, each with its file and line. Anything
  named only in the setup text is an assumption.
- Claim audit: Studio's claims labelled from the existing verdicts: Verified, Contradicted, Potential
  risk, Assumption, Unknown. Only quotes the engine verified are shown.
- Judge Q&A: a fixed set of questions across architecture, technology choices, security,
  scalability, feasibility, differentiation, limitations and failure scenarios. Answers are assembled
  from verified evidence, claims and Prove rulings; anything else is marked unanswered.
- Report: all of the above as Markdown (download or copy), with demo results labelled.

Studio's code lock is kept: until the claims are checked, Hackathon shows file names and line
numbers but no code lines. Hackathon uses the prototype's Sapphire Chrome material and sculpture.

Files: new `src/modes/ModeSwitch.tsx`, `src/hackathon/*` (shell, five sections, shared parts,
tones) and `src/hackathon/analysis/*` (stack, audit, readiness, judge, report);
`tests/hackathon.test.ts` (22 tests). Changed `src/App.tsx`, `src/project/types.ts` and
`src/project/reducer.ts` (view state), `src/materials.css` (Sapphire, the switch, the
current-section plate), `src/artwork/materials.ts` and `src/artwork/artwork.css` (Sapphire sculpture
and fallback).

### Checks actually run

- Typecheck: passed. Tests: 127/127 (the 105 from Phases 1–6 unchanged, plus 22). Build: passed
  (CSS 63.3 kB, JS 448.1 kB; JS +47 kB). Surface contrast: 1,498/1,498 including Sapphire.
- Browser, demo mode, at 1440×900, 1024×768 and 375×812: Hackathon before files (empty state, back
  to Studio Load); Tech stack while locked shows no code lines; Studio through a Prove ruling; all
  five sections; the Markdown download (`velora-report.md`, demo label and all six sections); back
  to Studio on the same step with the same observation and ruling; twelve more switches; three files
  still loaded; same document throughout (no reload). 0 console errors, 0 failed requests, 0
  overflow on every screen.
- Mobile switch labels over the artwork, measured on real pixels on every Studio step and in
  Hackathon: 6.5:1 or better.
- Studio A/B against the Phase 6 code (served from a scratch copy on port 5176, then removed), at
  1440×900 and 1024×768: identical geometry, navigation, text and state on all five steps, including
  after a ruling and moving between steps; header height identical (68.64 px); pixels below the header
  identical on Explain, Claims, Evidence and Prove (Load differs only inside the WebGL dial). The
  header differs only by the new switch. At 375 px the switch's own row moves Studio's content down
  76 px; nothing else changes.

### Limitations

- Judge questions come from a fixed set, and answers are assembled, not written by an AI.
  AI-generated questions are not part of this phase.
- Stack detection reads one line at a time: a call split across lines (`supabase` on one line,
  `.from(...)` on the next) is not matched. It never reads files that were not uploaded.
- Readiness and documentation checks see only the uploaded files (at most 12, 150 KB each, 250 KB in
  total), so "missing" means "not uploaded".
- Memory only: refreshing or closing Velora discards the project, including Hackathon results; the
  report says so and can be downloaded.
- Deferred, as agreed: security scanning, bug identification, pitch generation, persistent storage,
  whole-repository analysis.

QA screenshots: `docs/redesign/phase7/` (26 files, about 15 MB), local only, excluded through
`.git/info/exclude` like Phases 3 and 4.

## Phase 6 — project store foundation (31 Oct 2026)

The Studio workflow's project state moved from 13 `useState` calls in `src/App.tsx` into one
in-memory project store, so later modes can share the same files and results. No visible or
behavioural change; no new API, persistence, mode switch or Hackathon feature.

- `src/project/types.ts`: `Project` (id, files, usingSample, context, filesDigest, studio) and
  `StudioState` (step, reached, card, explanation, claims, unexplained, checkedClaims, verdicts,
  verdictsDigest, findings).
- `src/project/reducer.ts`: `createProject` and `projectReducer`; each action is one of the state
  updates the Studio screen already made, applied in the same order. Two hardening rules (added at
  review): `setFiles` clears every result from the old files in the same update (claims,
  unexplained phrases, checked claims, verdicts, `verdictsDigest`, findings; `reached` capped at
  step 2; explanation and question card kept), and `setCheckResult` carries the fingerprint of the
  files the check was sent, captured when it started, and is ignored if the project's files have
  changed since.
- `src/project/digest.ts`: a short, synchronous fingerprint of the file set (not a security hash).
  Verdicts record the fingerprint of the files they were checked against.
- `src/project/store.tsx`: `ProjectProvider` (React `useReducer`) and `useProject`. Memory only:
  refreshing or closing the page discards the project, as before.
- `src/App.tsx` reads the project from the store and dispatches actions; request state (busy,
  error) and the demo/live status stay local. The evidence check takes the fingerprint of the files
  it sends before the request starts, and on return applies the result and moves to Evidence only
  if the project still holds those files. `src/main.tsx` wraps the app in `ProjectProvider`.
- `tests/projectStore.test.ts`: 24 tests, including a file change while a check is in flight.

### Checks actually run

- Typecheck: passed. Tests: 105/105 (the 81 existing, unchanged, plus 24 new). Build: passed; the
  CSS bundle is byte-identical to Phase 5.
- A/B against the committed Phase 5 code (`95d574c`, extracted with `git archive` to a scratch
  folder and served on port 5176, then removed): the same walkthrough at 1440×900, 1024×768 and
  375×812 gave identical element geometry, text and state on all five steps, including after
  recording a Prove ruling and moving Evidence → Claims → Load → Explain → Prove (the ruling, the
  observation and the explanation all kept). Screenshots pixel-identical on Explain, Claims,
  Evidence and Prove; Load differs only inside the WebGL dial, which varies between runs of the
  same code.
- File change after a full check, A/B against Phase 5: removing a file on Load re-locks Claims,
  Evidence and Prove, keeps Load and Explain open, keeps the explanation and the chosen question
  card, and leaves two files listed: identical in both versions (rerun after the hardening).
- 0 console errors, 0 failed requests, 0 horizontal overflow in every run.

## Phase 5 — Velora rebrand (31 Oct 2026)

Starting point: `085b2ce` plus an uncommitted rose-burgundy Velora rebrand already in the working
tree (`index.html`, `src/App.tsx`, new `src/brand.tsx`; not written in this session). That work was
kept: the rose-burgundy metallic V, the Velora wordmark, the tagline ASK · IDEATE · BUILD · VERIFY
· SHIP, the favicon, the `theme-color` and the page title.

Changes made on top of it:
- The header brand was an `<a href="/">`. Velora keeps the project in memory only, so that link
  reloaded the page and discarded the uploaded files, claims and verdicts. It is now static text
  (as the old wordmark was): not a link, not a tab stop; the banner reads "Velora".
- The tagline's monospace text asked for medium weight, which Phase 4 maps to bold; IBM Plex Mono
  has no bold loaded, so the browser faked it. It now uses the loaded 500 weight.
- The product name in existing user-facing sentences: Load intro and privacy notes, Evidence
  downgrade note and demo notice, the network error (`src/api.ts`) and the malformed-response
  error (`server/handlers.ts`). Wording otherwise unchanged.
- The meta description presented the tagline as features ("Ask, ideate, build, verify, and ship
  with Velora"). It now keeps the tagline as the tagline and describes what the app does.
- `README.md` (title, tagline, product name) and the `.env.example` comment.

Tagline against current capabilities: Verify is what the app does today (claims checked against
quotes from the uploaded code). Build, Ship, Ask and Ideate are brand direction, not current
features: the app does not generate or deploy code, answer questions or generate ideas. The
tagline is used only as a tagline (header, title, README); no copy describes those as features.

Intentionally unchanged internal identifiers: `package.json`/`package-lock.json` name `handwave`,
the `HANDWAVE_MODE` environment variable, the Vite plugin `handwave-api` and its log prefix,
`.claude/launch.json`, the folder name, code comments, test fixtures, the historical
`docs/synthetic-safeguard-report.md`, and the prototype.

### Checks actually run

- Typecheck: passed. Tests: 81/81 passed (no test changed). Build: passed (`dist/index.html`
  carries the Velora title and description). Phase 2 surface contrast: 1,135/1,135.
- Header in demo mode and simulated live mode (status answered in the test browser; no AI call)
  at 1440, 1024 and 375: brand is static text; tagline shown at 1440 and 1024 (500, 9.28 px),
  hidden at 375; title, SVG favicon and `theme-color` present; 0 overflow.
- Clicking the brand after loading the sample project: same page, three files still listed.
- Demo walkthroughs of all five steps at 1440×900, 1024×768 and 375×812: 0 console errors,
  0 failed requests, 0 overflow, artwork on every step, focus ring sapphire, and no "Handwave"
  in the rendered text (also checked in simulated live mode on Load).
- Header height is 69 px at 1440 and 1024 and 65 px at 375 (about 57 px before the rebrand): the
  rebrand's 40 px mark and two-line brand. Kept at your request (31 Oct 2026); may be revisited later.

## QA screenshots (all phases)

The Phase 3 and Phase 4 QA screenshots remain on this machine only, in `docs/redesign/phase3/`
(13 files, about 8.1 MB) and `docs/redesign/phase4/` (19 files, about 15 MB). Neither folder is in
any commit: both are listed in `.git/info/exclude`, which applies only to this local clone
(`.gitignore` is unchanged), so anyone else checking out the branch will not have them.

## Phase 4 — remaining visual polish (29 Oct 2026)

Starting checkpoint: `ad35e23` (Phase 3); documentation commit `e237d6d` on top. Approved scope:
core items 1–5 plus optional items 6 and 7. Visual only: no logic, API, wording, test or
configuration changes, no new dependencies.

| # | Change | Files |
|---|---|---|
| 1 | Hedge words: the solid cream highlighter becomes a soft band in the page's highlight colour with a fine rule under the baseline; the words keep the body colour | `src/index.css` |
| 2 | Primary buttons: 10 px corners, a glow in the material's colour, a light sheen on hover (none under reduced motion), a pressed state; height unchanged | `src/materials.css` |
| 3 | Text fields (setup field, claim text, category menu, observation notes): recessed dark wells with a light rim; focus stays sapphire; the ruled explanation surface is unchanged | `src/materials.css` |
| 4 | Section headings ("Verification summary", "Claim-by-claim results", "Verified evidence", "Findings to test"): bold tracked sans in the label colour instead of grey monospace; wording unchanged | `src/steps/EvidenceStep.tsx`, `src/steps/ProveStep.tsx` (class strings only) |
| 5 | Verdict stamps: tinted badges with a bold label, same colours and icons. Scoped to verdict stamps only (`.stamp.rounded-sm`, used only by `VerdictStamp`); the base `.stamp` rule is unchanged, so the header mode label (demo and live) and the claim-status and file-count labels keep their original style | `src/index.css` |
| 6 | Optional: on wide screens (1024 px and up) each step heading starts lower, as in the prototype, so the sculpture has room above the first card. The room follows the viewport height like the prototype's header: 100 px at 900 px tall, about 40 px at 768, none on short screens. Phones unchanged | `src/artwork/artwork.css` |
| 7 | Optional: a small sphere of each step's metal beside its number in the step navigation, hidden from assistive technology | `src/App.tsx` (one decorative `<span>`), `src/materials.css` |

### Checks actually run

- Typecheck: passed. Tests: 6 files, 81/81 passed. Production build: passed (CSS 59.12 kB, JS 395.94 kB).
- Phase 2 surface contrast: 1,135/1,135 pass. New pairings: verdict badges on verdict headers and
  panels, and every text colour on the hedge band, 40/40 pass after one correction (the first
  hedge band at 40% strength failed 8 of 40, lowest 2.82:1; reduced to 20% plus a rule below the
  baseline, lowest 5.06:1).
- Heading text over the artwork on real pixels after the headings moved: 10.53:1 or better at
  1440 and 375 (unchanged from Phase 3).
- Demo-mode walkthroughs of all five steps at 1440×900 and 375×812: 0 console errors, 0 failed
  requests, 0 px horizontal overflow.
- Step navigation: accessible names unchanged ("01 Load" … "05 Prove"), dots `aria-hidden`,
  current and disabled states unchanged.
- Primary button: disabled stays at 40% opacity; the hover sheen crosses only when motion is
  allowed; keyboard focus ring is sapphire.
- Header mode label, demo and live (live simulated in the test browser by answering
  `/api/status` with `mode: "live"`; no AI provider was called), at 1440 and 375: monospace,
  weight 500, 1 px border, 3 px corners, no fill — the same rule as before Phase 4. Claim-status
  and file-count labels likewise; verdict badges on Evidence use the new tinted style.
- Heading spacing against the prototype (step label top / first card top):
  - 1440×900: production 212 / 417–504 px; prototype 215–245 / 442 px.
  - 1024×768: production 151 / 356–443 px (a fixed 100 px gave 212 / 417–504); prototype
    120–217 / 397 px. Hence the height-based spacing.

### QA screenshots (`docs/redesign/phase4/`, local only, not committed)

19 PNG files, about 15 MB, excluded through `.git/info/exclude` like Phase 3's:
`phase4-before-after.png` (prototype, Phase 3, Phase 4 for all five steps at 1440×900),
`desktop-<step>.png` and `desktop-<step>-full.png`, `mobile-<step>.png`, `phase4-mobile.png`,
`hedge-marks.png` and `button-hover.png`. Full-page captures show a seam where the fixed artwork
canvas ends; that is how the stitched capture renders a fixed layer, not something on the page.

### Remaining differences after Phase 4

Intentional: production layout, navigation, wording and the Evidence vertical list; the Handwave
wordmark (left for the Velora rebrand); prototype-only pages and controls; the small mobile
sculpture. Not addressed: the prototype's exhibit headers and highlighted cited lines in code
blocks, its verdict meter and ruling dial (these need new content or structure).

### Approval

Phase 4 was approved after visual review and committed locally as `005d50a` on 29 Oct 2026, with
exactly the seven files listed above. This record was then updated in a separate,
documentation-only commit ("Docs: record Phase 4 completion"). Nothing has been pushed or
deployed, and no remote exists.

## Phase 3 — metallic hero artwork (29 Oct 2026)

Each step now shows the approved prototype's sculpture behind the interface, top right, in the
page-header composition:

| Step | Material | Sculpture (shader mode) |
|---|---|---|
| Load | Obsidian Titanium | lathe-turned dial, machined terraces (1) |
| Explain | Burgundy Lacquer | lacquered slab, one gliding window reflection (2) |
| Claims | Liquid Silver | polished round chrome bars (3) |
| Evidence | Emerald Petrol | emerald chrome sphere (4) |
| Prove | Champagne Metal | brushed champagne sheet, vertical satin bands (5) |

The shader and its runtime come from `prototype/liquid.ts` unchanged (checked by comparing the
source strings) except for two things: the colour helper is inlined instead of imported, and one
shader line moves the champagne sheet (Prove) 0.13 units right on wide screens, about 117 px at
1440×900, so it clears the intro paragraph. Its size is unchanged and phones are unaffected.
Material values are copied from `prototype/themes.ts`.

### Files changed

New:
- `src/artwork/liquid.ts` — the prototype's WebGL1 shader and runtime (no libraries, no textures).
- `src/artwork/materials.ts` — the five sculpture materials.
- `src/artwork/HeroArtwork.tsx` — mounts the canvas once, follows the step, fades on scroll,
  follows reduced motion, shows the CSS fallback without WebGL.
- `src/artwork/artwork.css` — canvas layer, CSS fallback per material, text-safe ground behind
  each step heading.
- `REDESIGN_PROGRESS.md` (this file).

Screenshots are kept locally in `docs/redesign/phase3/` and are not committed: that folder is
listed in `.git/info/exclude`, which is local to this clone and not part of any commit.

Modified:
- `src/App.tsx` — renders `<HeroArtwork>`; the step-to-material map is now typed; the content grid
  gets `relative z-[1]` so the interface sits above the canvas. Nothing moves.
- `src/ui.tsx` — one class hook (`hw-step-head`) on the step heading's `<header>`.
- `src/index.css` — imports `artwork/artwork.css`.

Unchanged: application logic, API calls, verification rules, state, wording, accessibility
attributes, upload limits, Phase 2 finishes, the Evidence vertical list, the prototype, and every
file in `shared/`, `server/`, `api/` and `tests/` (checked against the Phase 2 commit and the
baseline file hashes). No dependencies were added.

### Checks actually run

- Typecheck: passed. Tests: 6 files, 81/81 passed. Production build: passed
  (CSS 54.63 kB, JS 395.81 kB; JS grew by about 19 kB for the shader and runtime).
- Phase 2 surface contrast check: 1,135/1,135 pairings pass at full layer strength.
- Demo mode forced (`HANDWAVE_MODE=demo`, `/api/status` reports `demo`; no AI calls).
- Walkthrough of all five steps at 1440×900 and 375×812, reduced motion and full motion:
  0 console errors, 0 failed requests, 0 px horizontal overflow (also 0 at 768, 1024 and 1280).
- The canvas is `aria-hidden="true"` with `pointer-events: none`; every step was driven by real
  clicks through it. Keyboard focus ring still visible (sapphire `#9ccbff`).
- Heading text over the artwork, measured on real pixels (text hidden, brightest 1% of the pixels
  behind each line): every heading, intro and label at 1440 and 375 is 10.5:1 or higher (lowest:
  Evidence label at 375, 10.53:1). Prove intro: 13.0:1 after the move (8.09:1 before).
  Earlier readings of 1.43:1 for the Load heading were a fault in the measuring script: it took
  the screenshot before the page repainted, so the italic "one" was still in the sample. Waiting
  for the repaint fixed it (17.76:1).
- Prove after the move: the sheet's left edge is about 77 px clear of the intro at 1440×900
  (it overlapped the intro's last words by about 40 px before). At 375 px Prove is pixel-identical
  to before.
- Other four steps after the Prove change, compared pixel by pixel with the earlier screenshots:
  Claims and Evidence identical at both widths; Explain differs only in 22 dither pixels at 1440.
  Load differs in fine reflection detail of the dial, and so does a second run of the same code
  (about 21,000 pixels between two identical runs): the first screen's dial varies slightly from
  run to run. The change itself only applies to the champagne sculpture.
- Motion: with motion allowed the canvas animates (pixels change over 1.5 s); scrolled away it
  stops changing (rendering pauses when faded out). With reduced motion it is a still frame
  (no pixel change over 1.5 s). Rendering is at 75% of CSS pixels, capped at 1.5× DPR, lowered
  automatically if frames are slow, and paused when the tab is hidden.
- CSS fallback: with WebGL disabled each step shows its own CSS rendering (dial rings, lacquer
  slab, chrome bars, emerald sphere, satin sheet); 0 overflow.

Note: repeated test runs hit the app's own rate limit (30 API requests per 10 minutes, HTTP 429).
That is existing production behaviour, not a regression; the runs were repeated after the window
reset. Runs that inject scripts into the page also logged blocked Vite hot-reload WebSocket
connections; those come from the test browser, not the app.

### QA screenshots (`docs/redesign/phase3/`, local only, not committed)

Thirteen PNG files, about 8.1 MB, kept on this machine for review. They are not in any commit:
the folder is listed in `.git/info/exclude`, which applies only to this local clone (`.gitignore`
is unchanged). Anyone else checking out the branch will not have them.

- `phase3-before-after.png` — prototype, Phase 2 and Phase 3 side by side, all five steps, 1440×900.
- `desktop-<step>.png` (five) — Phase 3 at 1440×900. `mobile-<step>.png` (five) — Phase 3 at 375×812.
- `phase3-mobile.png` — the five mobile screens together. `css-fallback.png` — WebGL disabled.

`desktop-prove.png` and `phase3-before-after.png` were recaptured after the champagne sheet was
moved right; the other screenshots are from the run before that change (Prove at 375 px was
confirmed pixel-identical afterwards). All were taken in forced demo mode with reduced motion.

### Remaining differences from the prototype

1. Layout: production keeps its own single column and five-step navigation (no side rail with
   progress subtitles, no two-pane Evidence or Prove compositions, no Instrument, Circle or System
   pages, no Appearance controls). Intentional.
2. Wording and content stay production's (for example "Prove it yourself." against "The diagnostic
   console."). Intentional.
3. On phones (375 px) the sculpture is small and mostly hidden behind the header and step
   navigation, as in the prototype's portrait composition; it reads as a corner accent only.
4. The prototype's opening animation and "Light sweep"/"Opening" replay controls are not exposed;
   the sweep runs automatically on each step change.
5. The champagne sheet sits about 117 px farther right than in the prototype (on wide screens
   only), to keep it clear of production's wider Prove intro.
6. Card padding and corners remain production's (16–20 px, 12 px). Intentional.

### Approval

Phase 3 was approved after visual review and committed locally as `ad35e23` on 29 Oct 2026, with
exactly the eight files listed above. This record was then updated in a separate,
documentation-only commit ("Docs: record Phase 3 completion"). Nothing has been pushed or
deployed, and no remote exists.
