# Handwave metal redesign — progress

Branch `redesign/metal` (local only: no remote, nothing pushed or deployed).

| Phase | What | Commit | Status |
|---|---|---|---|
| 0 | Baseline: Git safety review, tests, build, screenshots | `bff3f73` | Completed and committed |
| 1 | Obsidian Titanium colour tokens, sapphire focus, deck typefaces | `84d49e0` | Completed and committed |
| 2 | Per-step metal finishes on cards, panels, tiles and rows | `3d98909` | Completed and committed |
| 3 | Metallic hero artwork behind each step | `ad35e23` | Completed and committed (approved 29 Oct 2026) |
| 4 | Remaining visual polish (seven approved items) | `005d50a` | Completed and committed (approved 29 Oct 2026) |
| 5 | Not yet scoped | starts from `005d50a` | Waiting for scope approval |

## Phase 5 — starting checkpoint

Phase 5 starts from commit `005d50a` (Phase 4) on `redesign/metal`. Its scope has not been
approved yet; no Phase 5 work has begun.

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
