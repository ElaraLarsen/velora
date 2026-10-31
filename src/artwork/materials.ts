// The sculpture behind each step, copied from the approved prototype (prototype/themes.ts).
// `mode` selects the surface structure in the shader, so each material has its own form:
//   1 Obsidian Titanium   lathe-turned dial
//   2 Burgundy Lacquer    lacquered slab with a gliding window reflection
//   3 Liquid Silver       polished chrome bars
//   4 Emerald Petrol      emerald chrome sphere
//   5 Champagne Metal     brushed champagne sheet
//   0 Sapphire Chrome     automotive body panel (Hackathon: Readiness)
// The other Hackathon sections (docs/HACKATHON_MATERIALS.md):
//   7 Anodised Graphite, 8 Heat-Tinted Titanium, 9 Burnished Copper, 10 Platinum Pearl,
//   6 Violet Anodised, 11 Glacier Chrome, 12 Tungsten

import type { Material } from "./liquid";

export type MaterialId =
  | "obsidian"
  | "burgundy"
  | "silver"
  | "emerald"
  | "champagne"
  | "sapphire"
  | "graphite"
  | "titanium"
  | "copper"
  | "pearl"
  | "violet"
  | "glacier"
  | "tungsten";

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
  sapphire: {
    tint: "#2F6BFF",
    base: "#0A1E5A",
    envTop: "#1A4BC8",
    envBottom: "#02040C",
    key: "#E8F1FF",
    rim: "#4FD3FF",
    bgA: "#03060F",
    bgB: "#0A1838",
    metal: 1,
    rough: 0.04,
    coat: 0,
    mode: 0,
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
  graphite: { tint: "#6F84A3", base: "#14181F", envTop: "#4A5568", envBottom: "#05070A", key: "#EEF3FA", rim: "#9FB4D0", bgA: "#05070A", bgB: "#10141B", metal: 1, rough: 0.16, coat: 0, mode: 7 },
  titanium: { tint: "#8A6BD0", base: "#1A1430", envTop: "#3A4FB0", envBottom: "#06040C", key: "#FFF4DC", rim: "#D9B56A", bgA: "#07050D", bgB: "#161026", metal: 1, rough: 0.08, coat: 0, mode: 8 },
  copper: { tint: "#D9824F", base: "#2A1408", envTop: "#B8643A", envBottom: "#140804", key: "#FFE6D2", rim: "#F2C1A0", bgA: "#0A0503", bgB: "#1E0E07", metal: 1, rough: 0.14, coat: 0, mode: 9 },
  pearl: { tint: "#ECEAF2", base: "#5A5C64", envTop: "#E4E6EC", envBottom: "#4A4B52", key: "#FFF8EE", rim: "#FFF1E0", bgA: "#0B0B0D", bgB: "#1B1C20", metal: 0.6, rough: 0.2, coat: 1, mode: 10 },
  violet: { tint: "#B04CE0", base: "#160A2E", envTop: "#4A2A9A", envBottom: "#05020C", key: "#F4E9FF", rim: "#6C3FD8", bgA: "#06030E", bgB: "#140A2A", metal: 1, rough: 0.05, coat: 0, mode: 6 },
  glacier: { tint: "#9EE6F5", base: "#0B2A36", envTop: "#6CC4DC", envBottom: "#03121A", key: "#F4FEFF", rim: "#E8FBFF", bgA: "#030C11", bgB: "#08202A", metal: 1, rough: 0.02, coat: 0, mode: 11 },
  tungsten: { tint: "#8E9198", base: "#101114", envTop: "#5E6470", envBottom: "#030304", key: "#F2F5F9", rim: "#D7DCE4", bgA: "#050506", bgB: "#121317", metal: 1, rough: 0.12, coat: 0, mode: 12 },
};
