// Prints every theme pairing with its WCAG contrast ratio. Run: npx tsx prototype/check-contrast.mts
import { THEME_ORDER, THEMES, contrast, pairings } from "./themes.ts";

let failures = 0;
for (const id of THEME_ORDER) {
  const t = THEMES[id];
  console.log(`\n${t.name}`);
  for (const p of pairings(t)) {
    const r = contrast(p.fg, p.bg);
    const ok = r >= p.min;
    if (!ok) failures++;
    console.log(`  ${ok ? "pass" : "FAIL"}  ${r.toFixed(2).padStart(5)}:1  (min ${p.min})  ${p.label}  ${p.fg} on ${p.bg}`);
  }
}
// The metal cards: every text colour against the brightest band of each material's card body
// (the --c-bg stops in prototype.css). Circle uses the burgundy page colours.
const CARD_PEAKS: [string, keyof typeof THEMES, string][] = [
  ["Sapphire card", "sapphire", "#183482"],
  ["Obsidian card", "obsidian", "#2E3238"],
  ["Burgundy card", "burgundy", "#6A1C32"],
  ["Circle card", "burgundy", "#681848"],
  ["Silver card", "silver", "#30363E"],
  ["Emerald card", "emerald", "#1B4033"],
  ["Champagne card", "champagne", "#40321D"],
];
console.log("\nMetal cards (brightest band)");
for (const [label, id, peak] of CARD_PEAKS) {
  const t = THEMES[id];
  for (const [name, fg] of [["text", t.text], ["secondary", t.text2], ["muted", t.muted], ["label", t.eyebrow], ["accent", t.accent], ["supported", t.ok], ["contradicted", t.bad], ["not verifiable", t.unk]] as const) {
    const r = contrast(fg, peak);
    const ok = r >= 4.5;
    if (!ok) failures++;
    console.log(`  ${ok ? "pass" : "FAIL"}  ${r.toFixed(2).padStart(5)}:1  ${label}: ${name} ${fg} on ${peak}`);
  }
}
console.log(`\n${failures} failing pairing(s).`);
process.exit(failures ? 1 : 0);
