// Safeguard audit on fabricated files and hand-written model responses.
// No AI, no network: every outbound request path is blocked and counted, and the count must stay zero.
import { readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { handleCheck } from "../server/handlers";
import type { AiProvider } from "../server/providers";
import { route } from "../server/router";
import { buildFixPrompt } from "../shared/fixPrompt";
import { LIMITS } from "../shared/sourceFiles";
import type { CheckedVerdict, ClaimCategory, ConfirmedClaim, QuoteLocation, SourceFile } from "../shared/types";
import { reverifyVerdicts, summarize } from "../shared/verdictRules";

// ---------- network block ----------

const blocked: string[] = [];
beforeAll(() => {
  const deny = (what: string) => () => {
    blocked.push(what);
    throw new Error(`Network access is blocked in the synthetic safeguard suite (${what}).`);
  };
  vi.stubGlobal("fetch", vi.fn(deny("fetch")));
  vi.spyOn(http, "request").mockImplementation(deny("http.request"));
  vi.spyOn(http, "get").mockImplementation(deny("http.get"));
  vi.spyOn(https, "request").mockImplementation(deny("https.request"));
  vi.spyOn(https, "get").mockImplementation(deny("https.get"));
});
afterAll(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ---------- fixtures ----------

const FIXTURES = join(__dirname, "fixtures", "synthetic");
const read = (rel: string) => readFileSync(join(FIXTURES, rel), "utf8");
const FILES: SourceFile[] = ["app/upload.js", "app/server.js", "app/i18n.js"].map((name) => ({ name, content: read(name) }));
const RESPONSES = JSON.parse(read("check-responses.json")) as Record<string, unknown>;

const CLAIM_TEXT: Record<string, [string, ClaimCategory]> = {
  c1: ["Photos over 2 MB are rejected.", "data"],
  c2: ["Uploaded photos are stored permanently.", "data"],
  c3: ["If the upload fails, the user sees an error.", "failure"],
  c4: ["There is a Tamil label for the upload button.", "behavior"],
  c5: ["Only logged-in users can list photos.", "access"],
  c6: ["Every upload attempt is logged.", "behavior"],
  c7: ["The server stores the request body.", "data"],
};
const claims = (...ids: string[]): ConfirmedClaim[] => ids.map((id) => ({ id, text: CLAIM_TEXT[id]![0], category: CLAIM_TEXT[id]![1] }));

/** A provider that replays pre-written raw responses and never touches the network. */
function replay(...raw: string[]) {
  let calls = 0;
  const provider: AiProvider = {
    id: "gemini",
    label: "Pre-written responses",
    model: "fixture",
    live: true,
    async complete() {
      calls++;
      const next = raw.shift();
      if (next === undefined) throw new Error("no more pre-written responses");
      return next;
    },
  };
  return { provider, calls: () => calls };
}

async function check(caseName: string, ids: string[], files: SourceFile[] = FILES) {
  const { provider } = replay(JSON.stringify(RESPONSES[caseName]));
  const r = await handleCheck({ claims: claims(...ids), files }, { provider });
  expect(r.status).toBe(200);
  const body = r.body as { verdicts: CheckedVerdict[] };
  return Object.fromEntries(body.verdicts.map((v) => [v.claimId, v]));
}

/**
 * Independent line-number oracle: matches trimmed lines against trimmed file lines.
 * Shares no code with the verifier, which works on character offsets.
 */
function oracle(fileContent: string, quote: string): QuoteLocation["lineStart"][] {
  const lines = fileContent.split(/\r?\n/).map((l) => l.trim());
  const q = quote.split(/\r?\n/).map((l) => l.trim());
  const starts: number[] = [];
  for (let i = 0; i + q.length <= lines.length; i++) {
    if (q.every((ql, j) => (j === 0 || j === q.length - 1 ? lines[i + j]!.includes(ql) : lines[i + j] === ql))) starts.push(i + 1);
  }
  return starts;
}

function expectLocation(v: CheckedVerdict, index: number, file: string, lineStart: number, lineEnd: number) {
  const e = v.evidence[index]!;
  expect(e.status).toBe("verified");
  expect(e.location).toEqual({ file, lineStart, lineEnd });
  // Second, independent opinion on the same numbers.
  const content = FILES.find((f) => f.name === file)?.content ?? "";
  expect(oracle(content, e.claimedText)[0]).toBe(lineStart);
  // Displayed text is cut from the file, never the model's string.
  expect(content.replace(/\r\n?/g, "\n").split("\n").slice(lineStart - 1, lineEnd).join("\n")).toBe(e.linesText);
}

// ---------- accepted quotes ----------

describe("synthetic: quotes that must be accepted", () => {
  it("exact single line, with line number confirmed by the oracle", async () => {
    const v = await check("exact_single_line", ["c1"]);
    expect(v.c1!.verdict).toBe("SUPPORTED");
    expect(v.c1!.evidence[0]!.match).toBe("exact");
    expectLocation(v.c1!, 0, "app/upload.js", 5, 5);
  });

  it("re-indented multi-line quote verifies, and the display shows the file's own indentation", async () => {
    const v = await check("reindented_multi_line", ["c1"]);
    expect(v.c1!.evidence[0]!.match).toBe("whitespace");
    expectLocation(v.c1!, 0, "app/upload.js", 5, 6);
    expect(v.c1!.evidence[0]!.linesText).toBe('  if (file.size > MAX_UPLOAD_BYTES) {\n    throw new Error("Photo too large");');
  });

  it("two-line contradiction keeps its consequence rating", async () => {
    const v = await check("contradiction_two_lines", ["c3"]);
    expect(v.c3!.verdict).toBe("CONTRADICTED");
    expect(v.c3!.consequence).toBe("MEDIUM");
    expectLocation(v.c3!, 0, "app/upload.js", 13, 14);
  });

  it("a line that appears twice reports both occurrences", async () => {
    const v = await check("duplicate_line", ["c6"]);
    expect(v.c6!.evidence[0]!.occurrences.map((o) => o.lineStart)).toEqual([19, 23]);
    expect(oracle(FILES[0]!.content, '  console.log("attempt");')).toEqual([19, 23]);
  });

  it("Tamil and Hindi lines verify with correct line numbers", async () => {
    const v = await check("indic_scripts", ["c4"]);
    expect(v.c4!.verdict).toBe("SUPPORTED");
    expectLocation(v.c4!, 0, "app/i18n.js", 6, 6);
    expectLocation(v.c4!, 1, "app/i18n.js", 10, 10);
  });

  it("CRLF line endings give the same lines as LF", async () => {
    const crlf = FILES.map((f) => ({ ...f, content: f.content.replace(/\n/g, "\r\n") }));
    const v = await check("contradiction_two_lines", ["c3"], crlf);
    expect(v.c3!.evidence[0]!.location).toEqual({ file: "app/upload.js", lineStart: 13, lineEnd: 14 });
    expect(v.c3!.evidence[0]!.linesText).not.toContain("\r");
  });

  it("a file just under the 150 KB limit still verifies, with the right line number deep in the file", async () => {
    const filler = Array.from({ length: 3000 }, (_, i) => `const filler${i} = ${i}; // padding line`);
    const needle = "  const lateSecret = readServerEnv('PHOTO_BUCKET');";
    const lines = [...filler, needle, "module.exports = {};"];
    let content = lines.join("\n") + "\n";
    // Pad a trailing comment so the file is within 100 bytes of the limit.
    content += "//" + "x".repeat(LIMITS.maxFileBytes - new TextEncoder().encode(content).length - 3) + "\n";
    const size = new TextEncoder().encode(content).length;
    expect(size).toBeLessThanOrEqual(LIMITS.maxFileBytes);
    expect(size).toBeGreaterThan(LIMITS.maxFileBytes - 100);

    const big: SourceFile[] = [{ name: "app/big.js", content }];
    const response = {
      verdicts: [
        {
          claimId: "c1",
          verdict: "SUPPORTED",
          explanation: "x",
          quotes: [{ file: "app/big.js", text: needle }],
          alternativeInterpretation: "",
          missingContext: "",
          consequence: "NONE",
          manualTest: { steps: ["n/a"], expected: "" },
        },
      ],
    };
    const { provider } = replay(JSON.stringify(response));
    const r = await handleCheck({ claims: claims("c1"), files: big }, { provider });
    const v = (r.body as { verdicts: CheckedVerdict[] }).verdicts[0]!;
    expect(v.evidence[0]!.location).toEqual({ file: "app/big.js", lineStart: 3001, lineEnd: 3001 });
    expect(oracle(content, needle)).toEqual([3001]);
  });
});

// ---------- rejected quotes and downgrades ----------

describe("synthetic: quotes that must be rejected, and the downgrades they cause", () => {
  it("rejects invented, altered, misattributed, missing-file, too-short and regex quotes", async () => {
    const v = await check("rejected_quotes_matrix", ["c2", "c3", "c4", "c5", "c6", "c7"]);
    const statuses = (id: string) => v[id]!.rejectedQuotes.map((q) => q.status);
    expect(statuses("c2")).toEqual(["not_found"]); // invented
    expect(statuses("c3")).toEqual(["not_found"]); // one character off
    expect(statuses("c4")).toEqual(["wrong_file"]); // real text, wrong file
    expect(statuses("c5")).toEqual(["wrong_file", "not_found"]); // file never uploaded
    expect(statuses("c6")).toEqual(["too_short"]);
    expect(statuses("c7")).toEqual(["not_found"]); // regex characters are literal
    for (const id of ["c2", "c3", "c4", "c5", "c6", "c7"]) {
      expect(v[id]!.evidence).toEqual([]);
      expect(v[id]!.verdict).toBe("NOT_VERIFIABLE");
      expect(v[id]!.downgradeReason).toBe("no_verified_evidence");
      expect(v[id]!.consequence).toBe("NONE");
      // No rejected quote carries displayable source text.
      for (const q of v[id]!.rejectedQuotes) {
        expect(q.sourceText).toBeUndefined();
        expect(q.linesText).toBeUndefined();
        expect(q.location).toBeUndefined();
      }
    }
    expect(v.c2!.proposedVerdict).toBe("SUPPORTED");
    expect(v.c5!.proposedVerdict).toBe("CONTRADICTED");
  });

  it("downgrades CONTRADICTED without quotes, and leaves NOT_VERIFIABLE alone", async () => {
    const v = await check("verdicts_without_quotes", ["c2", "c5"]);
    expect(v.c2!.verdict).toBe("NOT_VERIFIABLE");
    expect(v.c2!.downgradeReason).toBe("no_verified_evidence");
    expect(v.c5!.verdict).toBe("NOT_VERIFIABLE");
    expect(v.c5!.downgradeReason).toBeUndefined();
  });

  it("keeps the real quote and drops the invented one in the same verdict", async () => {
    const v = await check("mixed_real_and_invented", ["c2"]);
    expect(v.c2!.verdict).toBe("CONTRADICTED");
    expect(v.c2!.evidence).toHaveLength(1);
    expectLocation(v.c2!, 0, "app/server.js", 6, 7);
    expect(v.c2!.rejectedQuotes.map((q) => q.status)).toEqual(["not_found"]);
  });

  it("never upgrades NOT_VERIFIABLE, even with a real quote, and drops its consequence", async () => {
    const v = await check("not_verifiable_with_real_quote", ["c5"]);
    expect(v.c5!.verdict).toBe("NOT_VERIFIABLE");
    expect(v.c5!.consequence).toBe("NONE");
    expectLocation(v.c5!, 0, "app/server.js", 11, 11);
  });

  it("ignores unconfirmed claim ids and duplicate verdicts; a confirmed claim with no verdict is NOT_VERIFIABLE", async () => {
    const v = await check("id_bookkeeping", ["c1", "c7"]);
    expect(Object.keys(v).sort()).toEqual(["c1", "c7"]);
    expect(v.c1!.verdict).toBe("NOT_VERIFIABLE"); // first verdict wins over the later SUPPORTED one
    expect(v.c1!.evidence).toEqual([]);
    expect(v.c7!.verdict).toBe("NOT_VERIFIABLE");
    expect(v.c7!.downgradeReason).toBe("no_verdict_returned");
  });

  it("summary counts match the rejected-quote matrix", async () => {
    const { provider } = replay(JSON.stringify(RESPONSES.rejected_quotes_matrix));
    const r = await handleCheck({ claims: claims("c2", "c3", "c4", "c5", "c6", "c7"), files: FILES }, { provider });
    expect((r.body as { summary: unknown }).summary).toEqual({ total: 6, supported: 0, contradicted: 0, notVerifiable: 6, downgraded: 6, rejectedQuotes: 7 });
  });
});

// ---------- malformed responses ----------

describe("synthetic: malformed model output never produces a partial result", () => {
  const good = RESPONSES.exact_single_line as { verdicts: Record<string, unknown>[] };
  const variants: [string, string][] = [
    ["invalid JSON", '{"verdicts": [ {"claimId": "c1", '],
    ["unknown verdict value", JSON.stringify({ verdicts: [{ ...good.verdicts[0], verdict: "PROBABLY_FINE" }] })],
    ["five quotes (limit is four)", JSON.stringify({ verdicts: [{ ...good.verdicts[0], quotes: Array(5).fill({ file: "app/upload.js", text: "  if (file.size > MAX_UPLOAD_BYTES) {" }) }] })],
    ["missing manualTest", JSON.stringify({ verdicts: [{ ...good.verdicts[0], manualTest: undefined }] })],
    ["wrong top-level shape", JSON.stringify([good.verdicts[0]])],
  ];
  for (const [label, raw] of variants) {
    it(`${label}: one retry, then an error with no verdicts`, async () => {
      const { provider, calls } = replay(raw, raw);
      const r = await handleCheck({ claims: claims("c1"), files: FILES }, { provider });
      expect(r.status).toBe(502);
      expect(r.body).toMatchObject({ error: "malformed_ai_response" });
      expect(r.body).not.toHaveProperty("verdicts");
      expect(calls()).toBe(2);
    });
  }
});

// ---------- browser re-verification and fix prompt ----------

describe("synthetic: browser re-verification and fix prompts", () => {
  it("re-verification against altered files downgrades evidence the browser can't find", async () => {
    const { provider } = replay(JSON.stringify(RESPONSES.contradiction_two_lines));
    const r = await handleCheck({ claims: claims("c3"), files: FILES }, { provider });
    const fromServer = (r.body as { verdicts: CheckedVerdict[] }).verdicts;
    expect(reverifyVerdicts(fromServer, FILES)[0]!.verdict).toBe("CONTRADICTED");
    const altered = FILES.map((f) => (f.name === "app/upload.js" ? { ...f, content: f.content.replace('showToast("Uploaded!");', 'showToast("Done");') } : f));
    const [v] = reverifyVerdicts(fromServer, altered);
    expect(v!.verdict).toBe("NOT_VERIFIABLE");
    expect(v!.evidence).toEqual([]);
    expect(summarize([v!]).downgraded).toBe(1);
  });

  it("the fix prompt contains only the claim, the user's notes and verified source lines", async () => {
    const v = await check("mixed_real_and_invented", ["c2"]);
    const prompt = buildFixPrompt({ claim: claims("c2")[0]!, verdict: v.c2!, observation: "After a restart the list was empty." });
    expect(prompt).toContain("What I intended: Uploaded photos are stored permanently.");
    expect(prompt).toContain("After a restart the list was empty.");
    expect(prompt).toContain("app/server.js, lines 6-7:");
    expect(prompt).toContain("  // Stores the photo in memory only; nothing is persisted.\n  photos.push(req.body);");
    expect(prompt).not.toContain("fs.writeFileSync"); // rejected quote
    expect(prompt).not.toContain("Photos are kept in memory only."); // model's wording
  });
});

// ---------- end to end through the router, demo mode ----------

describe("synthetic: router with no key never calls out", () => {
  it("demo mode judges nothing on non-sample code and makes no network call", async () => {
    const r = await route("/api/check", "POST", { claims: claims("c1", "c2"), files: FILES }, "test", { HANDWAVE_MODE: "demo" });
    expect(r.status).toBe(200);
    const body = r.body as { mode: string; verdicts: CheckedVerdict[] };
    expect(body.mode).toBe("demo");
    expect(body.verdicts.every((v) => v.verdict === "NOT_VERIFIABLE" && v.evidence.length === 0)).toBe(true);
  });

  it("the network block is active and nothing tried to use the network", () => {
    expect(() => (globalThis.fetch as unknown as () => void)()).toThrow(/blocked/);
    expect(() => http.request("http://example.invalid")).toThrow(/blocked/);
    expect(() => https.get("https://example.invalid")).toThrow(/blocked/);
    // The three deliberate probes above are the only blocked attempts.
    expect(blocked).toEqual(["fetch", "http.request", "https.get"]);
  });
});
