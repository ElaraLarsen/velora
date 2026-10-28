// Handwave material themes: one source of truth for the page CSS, the sculpture's material
// model and the contrast checks shown on the System page.
//
// Colour provenance:
//   (img n)   measured or picked from reference image n (dominant-colour sampling, then
//             highlight colours picked by eye where averaging washes them out)
//   (deck)    taken from the colours used in the PowerPoint deck
//   (derived) adjusted from a reference value to meet contrast or balance

import type { Material } from "./liquid";

export type ThemeId = "sapphire" | "obsidian" | "burgundy" | "silver" | "emerald" | "champagne";

export interface Theme {
  id: ThemeId;
  name: string;
  material: string;
  /** How the material is rendered, in words (shown on the System page). */
  finish: string;
  role: string;
  /** Page and surface colours. Panels are opaque enough that text contrast is measured against `surface`. */
  bg: string;
  bg2: string;
  surface: string;
  elevated: string;
  text: string;
  text2: string;
  muted: string;
  line: string;
  lineStrong: string;
  /** Section labels, in the deck's tracked small capitals. */
  eyebrow: string;
  /** Active navigation, selection, links. */
  accent: string;
  /** Emphasised words (the deck's champagne/bronze emphasis). */
  highlight: string;
  focus: string;
  /** Primary control: a metal of this theme. */
  btnTop: string;
  btnBottom: string;
  btnText: string;
  /** Functional status colours. Never used decoratively. */
  ok: string;
  bad: string;
  unk: string;
  warn: string;
  /** The sculpture's material model. */
  sculpture: Material;
}

const STATUS = { ok: "#7BE3A0", bad: "#FF8A8F", unk: "#C8D0DA", warn: "#F2C46B" };

export const THEMES: Record<ThemeId, Theme> = {
  sapphire: {
    id: "sapphire",
    name: "Sapphire Chrome",
    material: "Deep sapphire chrome with electric-blue and cyan reflections",
    finish: "Automotive body panel: mirror-polished blue chrome, long strip-light reflections, a crease and a dark cavity.",
    role: "Signature. The opening experience.",
    bg: "#050A18", // (img 39 #0A1132, darkened)
    bg2: "#0A1838", // (img 42 #082854, derived)
    surface: "#0C1A3A",
    elevated: "#13285A",
    text: "#F2F5FB",
    text2: "#C3CFE6",
    muted: "#9AA9C8",
    line: "rgba(195, 207, 230, 0.16)",
    lineStrong: "rgba(195, 207, 230, 0.32)",
    eyebrow: "#F3E0B0", // (deck: champagne labels on the sapphire panel)
    accent: "#5CC8FF", // (img 41 #09ACF6, lightened)
    highlight: "#F3E0B0",
    focus: "#8FDBFF",
    btnTop: "#2A63F0", // (img 39 #174BF8)
    btnBottom: "#0B2A8C", // (img 47 #091470, derived)
    btnText: "#FFFFFF",
    ...STATUS,
    sculpture: {
      tint: "#2F6BFF", // (img 39 #174BF8)
      base: "#0A1E5A",
      envTop: "#1A4BC8", // (img 42 #0671CD)
      envBottom: "#02040C",
      key: "#E8F1FF",
      rim: "#4FD3FF", // (img 41 cyan)
      bgA: "#03060F",
      bgB: "#0A1838",
      metal: 1,
      rough: 0.04,
      coat: 0,
      mode: 0,
    },
  },
  obsidian: {
    id: "obsidian",
    name: "Obsidian Titanium",
    material: "Black metal, smoked graphite, polished gunmetal, platinum highlights",
    finish: "Lathe-turned dial: machined terraces, fine turned rings and circular-brushed gunmetal reflections.",
    role: "The precision workspace: loading source files.",
    bg: "#07080A", // (img 44 #141412, darkened)
    bg2: "#101215",
    surface: "#15181C",
    elevated: "#1D2127",
    text: "#F1F2F4",
    text2: "#C6CBD3", // (img 53 #CECFD0)
    muted: "#959CA7", // (img 53 #8B9095, lightened)
    line: "rgba(206, 207, 208, 0.14)",
    lineStrong: "rgba(206, 207, 208, 0.3)",
    eyebrow: "#C8D0DA",
    accent: "#7DB8FF", // sapphire carries active states into the workspace
    highlight: "#E9D7A8",
    focus: "#9CCBFF",
    btnTop: "#5A606A", // (img 44 #6D6D70, gunmetal)
    btnBottom: "#2A2D33",
    btnText: "#FFFFFF",
    ...STATUS,
    sculpture: {
      tint: "#4A4F58", // (img 44 #4D4D4D)
      base: "#111215",
      envTop: "#3A3F47",
      envBottom: "#020203",
      key: "#F4F6F9", // platinum lights
      rim: "#9AA3AF",
      bgA: "#050506",
      bgB: "#121418",
      metal: 1,
      rough: 0.1,
      coat: 0,
      mode: 1,
    },
  },
  burgundy: {
    id: "burgundy",
    name: "Burgundy Lacquer",
    material: "Deep wine lacquer, smoked graphite, subtle silver detailing",
    finish: "Lacquered slab: deep wine under a clear coat, one window reflection gliding across it.",
    role: "The human voice: explaining in your own words, and the people space.",
    bg: "#12060A", // (img 50 #330D0E, darkened)
    bg2: "#22090F",
    surface: "#2A0D14", // (img 50 #4A171A, derived)
    elevated: "#3A1420",
    text: "#F7EEEA",
    text2: "#E5CDC7",
    muted: "#C2A39E",
    line: "rgba(229, 205, 199, 0.16)",
    lineStrong: "rgba(229, 205, 199, 0.32)",
    eyebrow: "#E9B9A2",
    accent: "#F0B9A6",
    highlight: "#F3E0B0",
    focus: "#F5C2B3",
    btnTop: "#9A2A3A", // (img 50 lacquer highlight)
    btnBottom: "#5A1220",
    btnText: "#FFFFFF",
    ...STATUS,
    sculpture: {
      tint: "#C0384E",
      base: "#8A1C31", // (img 50 lacquer, lifted so the colour reads under the coat)
      envTop: "#7A2232",
      envBottom: "#070203",
      key: "#FFF1EE",
      rim: "#C9CED6", // silver detailing
      bgA: "#0B0305",
      bgB: "#22090F",
      metal: 0.22,
      rough: 0.3,
      coat: 1,
      mode: 2,
    },
  },
  silver: {
    id: "silver",
    name: "Liquid Silver",
    material: "Polished silver, platinum, cool steel, dark reflective chrome",
    finish: "Polished chrome bars: round profiles sweeping through bright and dark studio bands.",
    role: "Clarity: reviewing the claims, sentence by sentence.",
    bg: "#0D1015",
    bg2: "#1A1F27",
    surface: "#181D24",
    elevated: "#222932",
    text: "#F3F5F8",
    text2: "#C9D0D9", // (img 53 #CECFD0)
    muted: "#9AA4B1", // (img 53 #8B9095, lightened)
    line: "rgba(201, 208, 217, 0.16)",
    lineStrong: "rgba(201, 208, 217, 0.32)",
    eyebrow: "#D7DEE7",
    accent: "#B9D2EE", // (img 43 #92AACF, lightened)
    highlight: "#E9EEF5",
    focus: "#A9D1FF",
    btnTop: "#FFFFFF", // (img 53 #F1F3F3)
    btnBottom: "#9EA7B3", // (img 53 #AEB1B4)
    btnText: "#0B0E12",
    ...STATUS,
    sculpture: {
      tint: "#E6EAF0", // (img 53)
      base: "#8A9099",
      envTop: "#C9D1DB", // (img 53 #CECFD0)
      envBottom: "#3E454E", // (img 53 #6A6F76, darkened)
      key: "#FFFFFF",
      rim: "#FFFFFF",
      bgA: "#0B0E12",
      bgB: "#1E242C",
      metal: 1,
      rough: 0.02,
      coat: 0,
      mode: 3,
    },
  },
  emerald: {
    id: "emerald",
    name: "Emerald Petrol",
    material: "Matte emerald, deep petrol, dark teal, placed silver reflections",
    finish: "Emerald chrome sphere: green mirror reflections with a deep, shadowed rim.",
    role: "The analytical room: reading evidence and source code.",
    bg: "#0A1410", // (img 49 #1E3528, darkened)
    bg2: "#102019",
    surface: "#13261E", // (img 49 #243B2D, derived)
    elevated: "#1B3329",
    text: "#EEF4EF",
    text2: "#C6D5CA",
    muted: "#9AB0A1",
    line: "rgba(198, 213, 202, 0.15)",
    lineStrong: "rgba(198, 213, 202, 0.3)",
    eyebrow: "#B7CDBC", // (deck: sage label on the green card)
    accent: "#E3C98F", // (img 48 gold wheels on matte green)
    highlight: "#F3E0B0",
    focus: "#A8E6D8",
    btnTop: "#237572", // (img 46 teal paint, deepened for AA)
    btnBottom: "#14494B",
    btnText: "#F2FBF8",
    ...STATUS,
    sculpture: {
      tint: "#3E8C7E", // (img 46 teal)
      base: "#1F4A3B", // (img 49 #2C4333, richer)
      envTop: "#2E5F52",
      envBottom: "#04100B",
      key: "#E3F1EA",
      rim: "#C8D3D0", // silver
      bgA: "#05100B",
      bgB: "#10241B",
      metal: 0.18,
      rough: 0.12,
      coat: 0.9,
      mode: 4,
    },
  },
  champagne: {
    id: "champagne",
    name: "Champagne Metal",
    material: "Blackened surfaces, champagne gold, muted brass",
    finish: "Hammered gold: small dimples, each catching its own warm glint.",
    role: "Special moments: testing findings and the fix brief.",
    bg: "#080706",
    bg2: "#13110D",
    surface: "#17140F",
    elevated: "#221D15",
    text: "#F6F1E6", // (deck #F4EFE4)
    text2: "#DCD1BA", // (deck #DCCFB4)
    muted: "#ACA088",
    line: "rgba(220, 209, 186, 0.15)",
    lineStrong: "rgba(220, 209, 186, 0.3)",
    eyebrow: "#E3C27E", // (deck #B08A4F, lightened for dark)
    accent: "#E3C27E",
    highlight: "#F3E0B0", // (deck)
    focus: "#F0D59A",
    btnTop: "#F1DCA8",
    btnBottom: "#B08A4F", // (deck)
    btnText: "#1A140A",
    ...STATUS,
    sculpture: {
      tint: "#C9A46A", // (deck #B08A4F, img 48 wheels)
      base: "#3A2C17",
      envTop: "#9A7A48",
      envBottom: "#4A3418",
      key: "#FFEBC4",
      rim: "#E7D2A6",
      bgA: "#060504",
      bgB: "#15120C",
      metal: 1,
      rough: 0.14,
      coat: 0,
      mode: 5,
    },
  },
};

/** Circle keeps the burgundy page colours; only its metal changes: violet/magenta chrome plates. */
export const CIRCLE_MATERIAL: Material = {
  tint: "#D62A82", // magenta
  base: "#22071F", // black-plum shadow
  envTop: "#5A1A5E",
  envBottom: "#0A0309",
  key: "#FFC2CF", // rose-pink peaks
  rim: "#8A3FE6", // violet
  bgA: "#0B0305", // the burgundy page background, unchanged
  bgB: "#22090F",
  metal: 1,
  rough: 0.08,
  coat: 0,
  mode: 6,
};

export const THEME_ORDER: ThemeId[] = ["sapphire", "obsidian", "burgundy", "silver", "emerald", "champagne"];

/** CSS custom properties for a theme. */
export function themeVars(t: Theme): Record<string, string> {
  return {
    "--bg": t.bg,
    "--bg2": t.bg2,
    "--surface": t.surface,
    "--elevated": t.elevated,
    "--text": t.text,
    "--text2": t.text2,
    "--muted": t.muted,
    "--line": t.line,
    "--line-strong": t.lineStrong,
    "--eyebrow": t.eyebrow,
    "--accent": t.accent,
    "--highlight": t.highlight,
    "--focus": t.focus,
    "--btn-top": t.btnTop,
    "--btn-bottom": t.btnBottom,
    "--btn-text": t.btnText,
    "--ok": t.ok,
    "--bad": t.bad,
    "--unk": t.unk,
    "--warn": t.warn,
  };
}

/* ---------- contrast (WCAG 2.2 relative luminance) ---------- */

function channel(c: number) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
export function contrast(a: string, b: string) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
/** Mixes two hex colours, used to measure the midpoint of a metal gradient. */
export function mix(a: string, b: string, t = 0.5) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i]! - v) * t).toString(16).padStart(2, "0")).join("");
}

export interface Pairing {
  label: string;
  fg: string;
  bg: string;
  min: number;
}

/** Every text/background pairing the prototype actually uses, per theme. */
export function pairings(t: Theme): Pairing[] {
  const btnMid = mix(t.btnTop, t.btnBottom);
  return [
    { label: "Body text on panel", fg: t.text, bg: t.surface, min: 4.5 },
    { label: "Body text on page", fg: t.text, bg: t.bg, min: 4.5 },
    { label: "Secondary text on panel", fg: t.text2, bg: t.surface, min: 4.5 },
    { label: "Muted text on panel", fg: t.muted, bg: t.surface, min: 4.5 },
    { label: "Muted text on raised panel", fg: t.muted, bg: t.elevated, min: 4.5 },
    { label: "Section label on page", fg: t.eyebrow, bg: t.bg, min: 4.5 },
    { label: "Accent / selection on panel", fg: t.accent, bg: t.surface, min: 4.5 },
    { label: "Primary button label (top)", fg: t.btnText, bg: t.btnTop, min: 4.5 },
    { label: "Primary button label (middle)", fg: t.btnText, bg: btnMid, min: 4.5 },
    { label: "Primary button label (bottom)", fg: t.btnText, bg: t.btnBottom, min: 4.5 },
    { label: "Supported on panel", fg: t.ok, bg: t.surface, min: 4.5 },
    { label: "Contradicted on panel", fg: t.bad, bg: t.surface, min: 4.5 },
    { label: "Not verifiable on panel", fg: t.unk, bg: t.surface, min: 4.5 },
    { label: "Warning on panel", fg: t.warn, bg: t.surface, min: 4.5 },
    { label: "Focus ring vs page (UI)", fg: t.focus, bg: t.bg, min: 3 },
  ];
}
