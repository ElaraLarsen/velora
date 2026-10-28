# Handwave design prototype — progress note

Saved 28 Oct 2026. Production Handwave is untouched: the production build (`npm run build`) still
produces byte-identical bundles (`index-BPHOlYAK.css`, `index-DuSl9zrH.js`). Nothing is committed
(the repository has no commits and no Git remote). Nothing is deployed.

## Run it

```
npx vite --port 5174
```

Then open http://localhost:5174/prototype/ (add `?filled` to start with the whole sample session).

## Status: metal cards and new Claims/Evidence artwork (awaiting your review)

- Claims artwork: polished silver chrome bars with fully round profiles (mode 3).
- Evidence artwork: a domed hexagonal cabochon in metallic petrol paint, flake and clear coat (mode 4).
- Real UI surfaces now carry each page's metal (`prototype.css`, `--c-*` variables per `data-material`):
  material body banding, surface structure, polished top edge, bevels, inner shadow, tinted drop
  shadow and a machined rim. Panels full finish; cards and rows satin; selections polished.
  The earlier "calm surface" layer that hid the pattern is gone.
- Header text-safe surface now spans the text column; sculptures moved clear of headings.
- Checks: 146/146 contrast pairings (including every text colour on each card's brightest band);
  layout audit 8/8 clean at 1440, 1024, 768 and 375; 81/81 tests; production build unchanged;
  no file outside `prototype/` changed. Screenshots taken in a headless browser at 1440x900.

## Earlier: metallic material redesign

Done and verified in the browser:

- Each material now has its own surface structure (`liquid.ts`): Sapphire automotive panel, Obsidian
  lathe-turned dial, Burgundy lacquered slab, Silver mercury ripples, Emerald satin facets with flake,
  Champagne hammered gold, and Circle's violet/magenta chrome plates with vertical light bands.
  Circle keeps its burgundy page colours; only its metal changed (`CIRCLE_MATERIAL` in `themes.ts`).
- Panels and tiles carry their page's material (`prototype.css`, keyed on `data-material`): the
  pattern sits in each panel's top band and fades into a plain surface behind text; tiles are satin.
- Headings and ledes near the artwork get a soft dark lift. No wording, colour tokens or logic changed.
- Reduced motion now also makes the page-colour change instant.
- Checks: type-check passes; 90/90 contrast pairings pass; layout audit clean on all 8 pages at 1440,
  1024, 768 and 375 px; 81/81 tests pass; production build byte-identical; no file outside
  `prototype/` changed.

## Earlier: art-direction correction

Done and verified:

- Artwork rebuilt: a ray-marched cluster of smoothly merged, rounded solids lit by a procedural
  studio (softboxes, round hotspots, horizon line, dark band). The ribbon/fabric shapes are gone.
- Six material models (metalness, roughness, clear coat), one per page:
  - Instrument: Sapphire Chrome
  - Load and System: Obsidian Titanium
  - Explain and Circle: Burgundy Lacquer
  - Claims: Liquid Silver
  - Evidence: Emerald Petrol
  - Prove: Champagne Metal
- The material cross-fades between pages (about 0.9 s) and a single sheet of light crosses the form on
  each page change. Pointer moves the lights. The form recedes as a page scrolls.
- Material-specific panel finishes per theme (brushed, lacquer gloss band, matte grain, engraved brass).
- Button states rebuilt: hover light sheet and edge, 1 px press, focus ring, bottom-edge progress bar for
  loading, self-drawing tick for success.
- Materials tour in the rail (and mobile menu): six swatches jump to each material's page, plus
  "Opening" and "Light sweep" replays.
- Circle concept disclosure restyled as a lacquered plate; wording and meaning unchanged.
- Checks: prototype type-check passes; 90/90 contrast pairings pass WCAG AA; layout audit clean on all
  8 pages at 1440, 1024, 768 and 375 px; 81/81 existing tests pass; production build passes.

Not yet done or not verified:

- The final mobile header fix (smaller sculpture in the top-right corner, full-width text scrim) was
  checked on the Evidence page at 375 px only; the full four-width audit ran before that change.
- Reduced-motion behaviour was verified in the previous round, not re-checked after this round.
- Frame rate not re-measured after the switch to ray marching (last measured: about 30 fps with
  adaptive resolution on this laptop's integrated Intel GPU).
- The System page's colour-family list still describes the earlier palette; the theme cards and
  contrast table there are current.

## Files

Everything is in `prototype/`. Outside it: one line in `src/index.css` (`@source not "../prototype"`,
keeps the app's CSS unchanged) and a "prototype" entry in `.claude/launch.json`.
