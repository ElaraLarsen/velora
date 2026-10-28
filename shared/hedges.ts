// Fixed word list, not AI: the user can see exactly why a phrase was highlighted.
export const HEDGE_PHRASES = [
  "i'm not sure",
  "i am not sure",
  "not sure",
  "i think",
  "i believe",
  "i guess",
  "i assume",
  "i suppose",
  "i hope",
  "hopefully",
  "presumably",
  "supposedly",
  "probably",
  "maybe",
  "might",
  "somehow",
  "magically",
  "basically",
  "kind of",
  "sort of",
  "or something",
  "something like",
  "it just",
  "should",
  "handles it",
  "handles that",
  "takes care of",
  "automatically",
] as const;

export interface HedgeSpan {
  start: number;
  end: number; // exclusive
  phrase: string;
}

const PATTERN = new RegExp(
  `\\b(${[...HEDGE_PHRASES]
    .sort((a, b) => b.length - a.length)
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/'/g, "['’]"))
    .join("|")})\\b`,
  "gi",
);

/** Non-overlapping hedge spans, longest phrase first. */
export function findHedges(text: string): HedgeSpan[] {
  const spans: HedgeSpan[] = [];
  PATTERN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PATTERN.exec(text)) !== null) {
    spans.push({ start: m.index, end: m.index + m[0].length, phrase: m[0] });
  }
  return spans;
}

export type Segment = { text: string; hedge: boolean };

/** Splits text into plain and hedge segments for rendering. */
export function segmentHedges(text: string): Segment[] {
  const out: Segment[] = [];
  let cursor = 0;
  for (const s of findHedges(text)) {
    if (s.start > cursor) out.push({ text: text.slice(cursor, s.start), hedge: false });
    out.push({ text: text.slice(s.start, s.end), hedge: true });
    cursor = s.end;
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor), hedge: false });
  return out;
}
