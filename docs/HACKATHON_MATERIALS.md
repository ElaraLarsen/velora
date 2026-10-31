# Hackathon material system — proposal (31 Oct 2026)

Status: **Stage 1 implemented (31 Oct 2026, not committed).** Each built section now has its own
material and sculpture as listed below. Pitch Studio's Rose Gold, Stage 2 (mode transition and
sound) and Stage 3 (per-page compositions) are not started. Before Stage 1, every Hackathon section
used Sapphire Chrome and the automotive body panel (form 0).

## What exists and how it extends

- **Surfaces.** A material is one `[data-material="…"]` block. It sets the page ground, the card body,
  surface texture, edges, accent and button colours, and a nav dot. A new material is a new block;
  Studio's five blocks stay as they are.
- **Sculpture.** A sculpture is a `Material` entry in `src/artwork/materials.ts` (colours,
  metalness, roughness, clear coat) plus a *form* in the shader. Studio uses forms 1–5 and Hackathon
  uses form 0. Form 6 (stacked chrome plates with drifting vertical light bands) exists in the shader
  but nothing uses it.
- **New forms.** A new form needs only an outline (`shape`) and a surface relief (`relief`); the
  shader's general metal shading lights it. Each Hackathon section can therefore have its own
  sculpture without touching Studio's.
- **Studio is untouched.** No Studio material block, sculpture entry or shader branch changes.

## The Hackathon family: "forged and anodised"

Studio's metals are finishes for a workshop: lacquer, satin, brushed and machined. Hackathon's are
finishes for competition hardware: anodised, heat-tinted, forged and chromed. They are cooler and
more saturated, each paired with a sharper sculpture. Sapphire stays the anchor (Readiness, the
toggle and the focus colour), so the family reads as one environment.

| Section | Material | Why this metal | Palette (body → light) | Surface finish on cards | Sculpture (form) | Page composition direction |
|---|---|---|---|---|---|---|
| Readiness | **Sapphire Chrome** (kept) | The command-centre overview; the brand's evaluation colour | #0A1E5A → #2F6BFF → #4FD3FF | Existing long strip reflections | Automotive body panel (0, existing) | Command-centre summary: one status line, then the checklist |
| Tech stack | **Anodised Graphite** | Layers of a stack; engineered, neutral and cool | #14181F → #4A5568 → #9FB4D0 | Fine machined horizontal grooves | Stacked offset plates, like a layer diagram (new 7) | Explorer grouped by layer, evidence on demand |
| Claim audit | **Heat-Tinted Titanium** | Metal tested under heat: straw, violet and blue oxidation bands mark how far a claim was stressed | #1A1430 → #6B4FA8 → #D9B56A | Faint diagonal oxidation gradient | Ring with a single inspection notch (new 8) | Inspection workspace: claim list with an evidence pane |
| Judge Q&A | **Burnished Copper** | A warm, human, conversational metal: the interview room | #2A1408 → #B8643A → #F2C1A0 | Soft hammered dimple texture | Two facing curved panels in dialogue (new 9) | Interview flow: one question at a time, answer below |
| Report | **Platinum Pearl** | Paper-white, satin: the record | #1B1C20 → #C9CCD4 → #FFF8EE | Matte satin, almost no reflection | Folded sheet with one crisp crease (new 10) | Document viewer: rendered report, export toolbar |
| Planner | **Violet Anodised** | Time in columns: drifting vertical light bands read as a timeline | #160A2E → #6C3FD8 → #E7D9FF | Vertical anodised bands | Stacked plates with moving light bands (6, existing, unused) | Timeline and board around the countdown |
| Submission | **Glacier Chrome** | Sealed and final: icy, clean, nothing left behind | #071A22 → #3FA9C9 → #E8FBFF | Clean polished chrome, cold highlight | Sealed capsule (new 11) | Final checklist with the deadline as the hero |
| Rubric | **Tungsten** | Weight and balance: dense, dark, precisely faceted | #101114 → #5E6470 → #D7DCE4 | Fine cross-hatched knurl | Balance disc on a beam (new 12) | Weighted evaluation: weights bar, then criteria |
| Pitch Studio | **Rose Gold** (reserved) | Stage light, and the bridge to the rose/burgundy V | #2A1216 → #C98A84 → #FFE3DC | Satin with a warm stage sheen | Spotlit podium disc (new 13) | **Not built**; reserved for when the section exists |

## Rules every material must meet (as Studio's did)

- **Contrast:** card bodies stay dark (brightest band about 0.045 relative luminance), so all text pairs keep WCAG AA. The contrast script must pass every pair.
- **Status colours** (verified, contradicted, risk) never change with the material.
- **Artwork:** sculptures stay top-right and fade on scroll, and don't sit under text. Each has a CSS fallback without WebGL and a static frame under reduced motion.
- **Nav dots:** each section gets a small sphere of its metal, like Studio's steps.

## Mode transition

- **Visual:**
  - Entering a mode shows a short label ("Hackathon" or "Studio") in the toggle area.
  - The page ground and sculpture cross-fade, using the existing ~0.9 s material blend.
  - The content fades in over about 200 ms.
  - Nothing moves position, so there's no layout shift. Under reduced motion it's an instant switch, with the label only.
- **Sound:**
  - An optional two-note tone generated with Web Audio: no audio file, under 300 ms, quiet.
  - It plays only on a click of the toggle, never on page load.
  - A speaker button sits next to the toggle, and its state is announced. The sound is muted until the user turns it on.

## Delivery stages and risk

1. **Surfaces and sculptures**:
   - Seven new material blocks, seven new forms, the per-section material switch and nav dots.
   - Contrast and Studio A/B checks follow, then screenshots of each section at three widths.
   - Low risk to Studio, because it only adds new blocks.
2. **Mode transition and sound.** Low risk.
3. **Per-page compositions** (the "page composition direction" column). Medium risk: it changes section layouts. Each section needs its own review.
