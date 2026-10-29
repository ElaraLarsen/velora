// The sculpture behind each step, copied from the approved prototype (prototype/themes.ts).
// `mode` selects the surface structure in the shader, so each material has its own form:
//   1 Obsidian Titanium   lathe-turned dial
//   2 Burgundy Lacquer    lacquered slab with a gliding window reflection
//   3 Liquid Silver       polished chrome bars
//   4 Emerald Petrol      emerald chrome sphere
//   5 Champagne Metal     brushed champagne sheet

import type { Material } from "./liquid";

export type MaterialId = "obsidian" | "burgundy" | "silver" | "emerald" | "champagne";

export const SCULPTURES: Record<MaterialId, Material> = {
  obsidian: {
    tint: "#4A4F58",
    base: "#111215",
    envTop: "#3A3F47",
    envBottom: "#020203",
    key: "#F4F6F9",
    rim: "#9AA3AF",
    bgA: "#050506",
    bgB: "#121418",
    metal: 1,
    rough: 0.1,
    coat: 0,
    mode: 1,
  },
  burgundy: {
    tint: "#C0384E",
    base: "#8A1C31",
    envTop: "#7A2232",
    envBottom: "#070203",
    key: "#FFF1EE",
    rim: "#C9CED6",
    bgA: "#0B0305",
    bgB: "#22090F",
    metal: 0.22,
    rough: 0.3,
    coat: 1,
    mode: 2,
  },
  silver: {
    tint: "#E6EAF0",
    base: "#8A9099",
    envTop: "#C9D1DB",
    envBottom: "#3E454E",
    key: "#FFFFFF",
    rim: "#FFFFFF",
    bgA: "#0B0E12",
    bgB: "#1E242C",
    metal: 1,
    rough: 0.02,
    coat: 0,
    mode: 3,
  },
  emerald: {
    tint: "#3E8C7E",
    base: "#1F4A3B",
    envTop: "#2E5F52",
    envBottom: "#04100B",
    key: "#E3F1EA",
    rim: "#C8D3D0",
    bgA: "#05100B",
    bgB: "#10241B",
    metal: 0.18,
    rough: 0.12,
    coat: 0.9,
    mode: 4,
  },
  champagne: {
    tint: "#C9A46A",
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
};
