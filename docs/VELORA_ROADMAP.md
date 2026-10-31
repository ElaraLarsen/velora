# Velora — assessment and roadmap (31 Oct 2026)

Written after the submission-night work (Phase 7.1). It answers the master specification's eight
questions. Nothing below marked *planned* exists in the code.

## 1. Feature inventory

**Implemented and verified** (unit tests plus browser runs at 1440, 1024 and 375 px, demo mode):

- Studio five-step workflow: Load, Explain, Claims, Evidence, Prove. Quote verification: a finding counts only when its quote is verbatim in an uploaded file.
- Shared project store: one project, a stale-result guard and atomic file changes.
- Studio | Hackathon switch: no reload, all state kept.
- Hackathon:
  - Readiness, Tech stack, Claim audit, Judge Q&A.
  - Report: Markdown download and copy.
  - Planner: deadline, countdown, tasks, milestones, solo/team, reminders and calendar.
  - Submission checklist.
  - Rubric.
- Guided tour, with skip and restart.
- Upload limits: 12 files, 150 KB each, 250 KB total. Demo/live labelling. Memory-only storage, with a warning before refresh.

**Implemented but incomplete:**

- Judge Q&A uses a fixed question set; answers are assembled, not generated.
- Stack detection reads one line at a time, so calls split across lines are missed.
- Reminders work only while the tab is open.
- Rubric suggestions match criterion names by keyword.
- Hackathon pages share one layout system. They differ in content, not in composition.

**Planned, not implemented:**

- Studio:
  - Project Workspace: type, title, objectives, solo/team.
  - Academic Documentation.
  - Viva Preparation.
  - Testing Lab.
  - Presentation Studio.
  - Code Intelligence beyond today's evidence check.
- Hackathon: Pitch and Demo Studio.
- Mode-switch animation and optional sound.

**Requires additional infrastructure:**

- Persistent storage and shared team editing (storage, accounts).
- System or push notifications (service worker, permissions).
- Live AI generation for documentation, viva and pitch drafts. It needs an approved paid provider; the free Gemini tier is not authorised for private code.
- Quality and security intelligence beyond static hints.
- Velora Deploy:
  - Provider APIs, OAuth, secret handling and build infrastructure.
  - A separate phase. Nothing exists yet.

## 2. Architecture assessment

- **Store:**
  - The single reducer with updater actions scales to more sections.
  - Planning data (planner, checklist, rubric) survives restarts and file changes by design.
  - Studio results are still invalidated by file changes, as before.
- **Risk: memory only.** A refresh loses everything; there's a warning prompt, but no recovery. Local persistence (IndexedDB) is the first infrastructure step, and the user must approve it because it changes the privacy promise.
- **Risk: bundle size.** JS is 501 kB, just over Vite's 500 kB warning. Lazy-load the Hackathon sections before adding more.
- **Reuse:**
  - Studio's Project Management should reuse `Planner` and `analysis/planner.ts` as-is.
  - Viva should reuse `judge.ts`.
  - Documentation should reuse `report.ts`.
  - Do not build second copies.

## 3. Visual design assessment

- Studio's per-step materials and compositions are intact. Desktop geometry was A/B-checked against Phase 6.
- Hackathon has its own Sapphire material and navigation. All eight sections use the same heading, card and list rhythm, though.
  - This is coherent, but it falls short of the specification's "purpose-built page" bar.
  - Strongest candidates for distinct compositions:
    - Planner as a board or timeline.
    - Judge Q&A as an interview flow.
    - Report as a document viewer.
- The new forms reuse Studio's field and button styles. Native date pickers vary by browser.

## 4. UX assessment

- **Fixed tonight:**
  - Download feedback.
  - Refresh warning.
  - Empty state that explains the sections and offers planning without files.
  - Report reachable without files.
  - Tour invitation no longer covers Load's buttons on phones.
- **Open:**
  - The phone section bar scrolls sideways with 8 items, and later items are off-screen at first.
  - The first dev-server load is slow when the server is cold (about 20 s in a headless run).
  - The owner and milestone choice in "Add a task" carries over to the next task. This is deliberate, but worth a hint.

## 5. Missing features

These are the planned items from §1. Order is set in §7.

## 6. Risks

| Risk | Mitigation |
|---|---|
| Adding many sections tonight breaks the demo | Freeze now; continue in stages after submission |
| Users trust self-scores or ticks as verification | Every such screen says "entered by you / not verified" |
| Documentation or viva features invent content | Generate only from uploaded files, user text and verified quotes; label every other line as a suggestion |
| Refresh loses work | Warn now; add opt-in local persistence next |
| Sound on mode switch annoys or fails | Off by default or muted after first use; never on page load; visual transition independent |

## 7. Roadmap (after submission, each stage independently testable)

1. **Stabilise:**
   - Commit Phases 6, 7 and 7.1 separately, if approved.
   - Lazy-load the Hackathon sections.
   - Add a scroll cue on the phone section bar.
2. **Opt-in local persistence:** IndexedDB, with a clear "saved on this device" label and a delete button.
3. **Studio Project Workspace:**
   - Type, title, objectives, solo/team.
   - Feeds the report and the tour.
4. **Studio Project Management:** mounts the existing Planner in Studio, with no duplicate.
5. **Viva Preparation:**
   - Extends `judge.ts` with module-wise questions.
   - Verified details are labelled separately from general suggested answers.
6. **Testing Lab:**
   - Turns Prove's manual tests into a test-case list.
   - Users record actual results; nothing is marked run unless the user records it.
7. **Academic Documentation and Presentation Studio:**
   - Outlines filled from workspace text, verified evidence and test records.
   - Missing sections are left as prompts.
8. **Hackathon distinct compositions** (Planner board, Judge interview, Report viewer), then the Pitch and Demo Studio.
9. **Mode transition:**
   - A 200–250 ms opacity and short-offset change, with none under reduced motion.
   - Optional Web Audio tone, generated in code with no asset, off on load and with a mute setting.
10. **Infrastructure phases, each scoped separately:** live AI provider, sync and teams, notifications, Velora Deploy.

## 8. Verification plan (every stage)

- **Code checks:** typecheck, all tests, and new unit tests for the stage's pure logic; production build.
- **Browser runs at 1440 × 900, 1024 × 768 and 375 × 812:** every touched page, with console errors, failed requests and horizontal overflow at zero.
- **Studio regression:**
  - A/B screenshot and geometry comparison against the last approved commit.
  - The full Studio → Hackathon → Studio walkthrough, with state preserved.
- **Accessibility:**
  - Contrast script over all text pairs.
  - Keyboard pass, focus after navigation, and reduced motion.
- **Before review:** record limitations in `REDESIGN_PROGRESS.md`. Do not commit without approval.
