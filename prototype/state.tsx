import { createContext, useContext } from "react";
import type { CheckedVerdict, SourceFile } from "../shared/types";
import type { DemoClaim } from "./data";
import type { ThemeId } from "./themes";

export type PageId = "instrument" | "load" | "explain" | "claims" | "evidence" | "prove" | "circle" | "system";
export type Motion = "subtle" | "cinematic";
export type Ruling = "confirmed" | "false_alarm" | "untested";

export interface PageDef {
  id: PageId;
  n: string;
  label: string;
  theme: ThemeId;
  group: "workflow" | "people" | "system";
  /** Why this page wears this material. Shown on the System page. */
  why: string;
}

export const PAGES: PageDef[] = [
  { id: "instrument", n: "00", label: "Instrument", theme: "sapphire", group: "workflow", why: "The signature: sapphire chrome introduces the product." },
  { id: "load", n: "01", label: "Load", theme: "obsidian", group: "workflow", why: "Precision intake: dense black titanium keeps attention on files and limits." },
  { id: "explain", n: "02", label: "Explain", theme: "burgundy", group: "workflow", why: "The human voice: warm lacquer marks where a person speaks in their own words." },
  { id: "claims", n: "03", label: "Claims", theme: "silver", group: "workflow", why: "Clarity: liquid silver reflects your words back as precise claims." },
  { id: "evidence", n: "04", label: "Evidence", theme: "emerald", group: "workflow", why: "Analysis: matte emerald is calm for long reading of code and verdicts." },
  { id: "prove", n: "05", label: "Prove", theme: "champagne", group: "workflow", why: "The culmination: champagne metal marks rulings and the fix brief." },
  { id: "circle", n: "06", label: "Circle", theme: "burgundy", group: "people", why: "People: burgundy is the colour of human voices, so the help space shares it with Explain." },
  { id: "system", n: "", label: "System", theme: "obsidian", group: "system", why: "The design system itself, on the neutral workspace material." },
];

export const WORKFLOW = PAGES.filter((p) => p.group === "workflow" && p.id !== "instrument");

export type StageState = "idle" | "running" | "done" | "failed";

export interface Session {
  go: (p: PageId) => void;
  motion: Motion;
  reduced: boolean;
  replayIntro: () => void;

  files: SourceFile[];
  usingSample: boolean;
  setFiles: (f: SourceFile[], sample: boolean) => void;
  context: string;
  setContext: (s: string) => void;

  card: string;
  setCard: (id: string) => void;
  explanation: string;
  setExplanation: (s: string) => void;

  claims: DemoClaim[] | null;
  setClaims: (c: DemoClaim[] | null) => void;
  confirmed: Set<string>;
  toggleConfirmed: (id: string) => void;

  verdicts: CheckedVerdict[] | null;
  setVerdicts: (v: CheckedVerdict[] | null) => void;
  selected: string | null;
  setSelected: (id: string) => void;

  rulings: Record<string, Ruling>;
  setRuling: (id: string, r: Ruling) => void;
  notes: Record<string, string>;
  setNote: (id: string, t: string) => void;
}

export const SessionContext = createContext<Session | null>(null);

export function useSession() {
  const s = useContext(SessionContext);
  if (!s) throw new Error("SessionContext missing");
  return s;
}

/** Waits, scaled by the motion setting; instant under reduced motion. Demo timing only. */
export function demoDelay(s: Pick<Session, "reduced" | "motion">, ms: number) {
  const scaled = s.reduced ? 0 : s.motion === "cinematic" ? ms : ms * 0.55;
  return new Promise<void>((r) => window.setTimeout(r, scaled));
}
