import { describe, expect, it } from "vitest";
import type { AiVerdict } from "../shared/schemas";
import type { ConfirmedClaim, SourceFile } from "../shared/types";
import { applyVerdictRules, reverifyVerdicts, summarize } from "../shared/verdictRules";

const files: SourceFile[] = [
  { name: "a.ts", content: "export function save(note) {\n  db.insert(note);\n  toast('Saved!');\n}\n" },
];
const claims: ConfirmedClaim[] = [
  { id: "c1", text: "Saving shows an error when it fails", category: "failure" },
  { id: "c2", text: "The API key is on the server", category: "secrets" },
  { id: "c3", text: "Notes are saved", category: "data" },
];

function verdict(over: Partial<AiVerdict>): AiVerdict {
  return {
    claimId: "c1",
    verdict: "CONTRADICTED",
    explanation: "x",
    quotes: [],
    alternativeInterpretation: "",
    missingContext: "",
    consequence: "MEDIUM",
    manualTest: { steps: ["Turn off wifi and save"], expected: "An error appears" },
    ...over,
  };
}

describe("applyVerdictRules", () => {
  it("keeps a contradiction backed by a verified quote", () => {
    const [v] = applyVerdictRules(claims.slice(0, 1), [verdict({ quotes: [{ file: "a.ts", text: "db.insert(note);\n  toast('Saved!');" }] })], files);
    expect(v!.verdict).toBe("CONTRADICTED");
    expect(v!.evidence).toHaveLength(1);
    expect(v!.evidence[0]!.location).toEqual({ file: "a.ts", lineStart: 2, lineEnd: 3 });
    expect(v!.consequence).toBe("MEDIUM");
  });

  it("downgrades SUPPORTED with only a fabricated quote", () => {
    const [v] = applyVerdictRules(
      [claims[1]!],
      [verdict({ claimId: "c2", verdict: "SUPPORTED", quotes: [{ file: "a.ts", text: "const key = process.env.SECRET_KEY" }] })],
      files,
    );
    expect(v!.verdict).toBe("NOT_VERIFIABLE");
    expect(v!.proposedVerdict).toBe("SUPPORTED");
    expect(v!.downgradeReason).toBe("no_verified_evidence");
    expect(v!.evidence).toHaveLength(0);
    expect(v!.rejectedQuotes).toHaveLength(1);
    expect(v!.consequence).toBe("NONE");
  });

  it("downgrades CONTRADICTED with no quotes at all", () => {
    const [v] = applyVerdictRules(claims.slice(0, 1), [verdict({ quotes: [] })], files);
    expect(v!.verdict).toBe("NOT_VERIFIABLE");
    expect(v!.downgradeReason).toBe("no_verified_evidence");
  });

  it("downgrades a quote attributed to the wrong file", () => {
    const [v] = applyVerdictRules(claims.slice(0, 1), [verdict({ quotes: [{ file: "b.ts", text: "export function save(note) {" }] })], files);
    expect(v!.verdict).toBe("NOT_VERIFIABLE");
    expect(v!.rejectedQuotes[0]!.status).toBe("wrong_file");
  });

  it("keeps verified quotes and drops fabricated ones in the same verdict", () => {
    const [v] = applyVerdictRules(
      claims.slice(0, 1),
      [verdict({ quotes: [{ file: "a.ts", text: "export function save(note) {" }, { file: "a.ts", text: "if (error) throw error;" }] })],
      files,
    );
    expect(v!.verdict).toBe("CONTRADICTED");
    expect(v!.evidence).toHaveLength(1);
    expect(v!.rejectedQuotes).toHaveLength(1);
  });

  it("leaves NOT_VERIFIABLE as is, even without quotes", () => {
    const [v] = applyVerdictRules([claims[1]!], [verdict({ claimId: "c2", verdict: "NOT_VERIFIABLE" })], files);
    expect(v!.verdict).toBe("NOT_VERIFIABLE");
    expect(v!.downgradeReason).toBeUndefined();
  });

  it("marks confirmed claims with no returned verdict as NOT_VERIFIABLE", () => {
    const out = applyVerdictRules(claims, [verdict({ quotes: [{ file: "a.ts", text: "export function save(note) {" }] })], files);
    expect(out.map((v) => v.verdict)).toEqual(["CONTRADICTED", "NOT_VERIFIABLE", "NOT_VERIFIABLE"]);
    expect(out[1]!.downgradeReason).toBe("no_verdict_returned");
  });

  it("ignores verdicts for claims the user never confirmed, and duplicate verdicts", () => {
    const out = applyVerdictRules(
      claims.slice(0, 1),
      [
        verdict({ claimId: "ghost", verdict: "SUPPORTED", quotes: [{ file: "a.ts", text: "export function save(note) {" }] }),
        verdict({ claimId: "c1", verdict: "NOT_VERIFIABLE" }),
        verdict({ claimId: "c1", verdict: "SUPPORTED", quotes: [{ file: "a.ts", text: "export function save(note) {" }] }),
      ],
      files,
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.verdict).toBe("NOT_VERIFIABLE");
  });

  it("browser re-verification drops evidence that doesn't match the browser's files", () => {
    const fromServer = applyVerdictRules(claims.slice(0, 1), [verdict({ quotes: [{ file: "a.ts", text: "export function save(note) {" }] })], files);
    const tampered = [{ name: "a.ts", content: "something else entirely\n" }];
    const [v] = reverifyVerdicts(fromServer, tampered);
    expect(v!.verdict).toBe("NOT_VERIFIABLE");
    expect(v!.downgradeReason).toBe("no_verified_evidence");
    expect(v!.rejectedQuotes).toHaveLength(1);
    expect(reverifyVerdicts(fromServer, files)[0]!.verdict).toBe("CONTRADICTED");
  });

  it("summarizes counts", () => {
    const out = applyVerdictRules(
      claims,
      [
        verdict({ quotes: [{ file: "a.ts", text: "export function save(note) {" }] }),
        verdict({ claimId: "c2", verdict: "SUPPORTED", quotes: [{ file: "a.ts", text: "fake fake fake fake" }] }),
        verdict({ claimId: "c3", verdict: "SUPPORTED", quotes: [{ file: "a.ts", text: "db.insert(note);" }] }),
      ],
      files,
    );
    expect(summarize(out)).toEqual({ total: 3, supported: 1, contradicted: 1, notVerifiable: 1, downgraded: 1, rejectedQuotes: 1 });
  });
});
