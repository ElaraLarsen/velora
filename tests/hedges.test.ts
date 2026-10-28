import { describe, expect, it } from "vitest";
import { findHedges, segmentHedges } from "../shared/hedges";

describe("findHedges", () => {
  it("finds hedge phrases case-insensitively", () => {
    const text = "I think it saves to Supabase and the login somehow handles that.";
    expect(findHedges(text).map((h) => h.phrase.toLowerCase())).toEqual(["i think", "somehow", "handles that"]);
  });

  it("prefers the longest phrase and does not double count", () => {
    const hits = findHedges("I'm not sure where the key lives.");
    expect(hits).toHaveLength(1);
    expect(hits[0]!.phrase).toBe("I'm not sure");
  });

  it("accepts curly apostrophes from dictation", () => {
    expect(findHedges("I’m not sure.")).toHaveLength(1);
  });

  it("respects word boundaries", () => {
    expect(findHedges("Mightiest shoulder maybelline")).toHaveLength(0);
  });

  it("returns nothing for a confident explanation", () => {
    expect(findHedges("Notes are stored in the notes table with the user's id.")).toHaveLength(0);
  });
});

describe("segmentHedges", () => {
  it("reassembles to the original text", () => {
    const text = "It probably shows an error, maybe a toast.";
    const segments = segmentHedges(text);
    expect(segments.map((s) => s.text).join("")).toBe(text);
    expect(segments.filter((s) => s.hedge).map((s) => s.text)).toEqual(["probably", "maybe"]);
  });
});
