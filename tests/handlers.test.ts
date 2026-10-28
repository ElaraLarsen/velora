import { describe, expect, it, vi } from "vitest";
import { handleCheck, handleExtract } from "../server/handlers";
import { ProviderError, createDemoProvider, createGeminiProvider, selectProvider, toGeminiSchema, type AiProvider, type StageInput } from "../server/providers";
import { RateLimiter } from "../server/rateLimit";
import { SAMPLE_CONTEXT, SAMPLE_EXPLANATION, SAMPLE_FILES } from "../shared/sample";
import { checkJsonSchema, extractJsonSchema } from "../shared/schemas";
import type { CheckedVerdict } from "../shared/types";

/** A provider that replays scripted raw responses and records what it was sent. */
function scripted(...responses: (string | Error)[]) {
  const calls: StageInput[] = [];
  const provider: AiProvider = {
    id: "gemini",
    label: "Fake",
    model: "fake-1",
    live: true,
    async complete(input) {
      calls.push(input);
      const next = responses.shift();
      if (next === undefined) throw new Error("no more scripted responses");
      if (next instanceof Error) throw next;
      return next;
    },
  };
  return { provider, calls };
}

const explanation = "When I save a note it goes into Supabase. Only I can see my notes, I think the login handles that.";
const files = [{ name: "notes.ts", content: "export async function listNotes() {\n  return supabase.from('notes').select('*');\n}\n" }];
const claims = [{ id: "c1", text: "Only the owner can read their notes", category: "access" as const }];

function verdictJson(quotes: { file: string; text: string }[], verdict = "CONTRADICTED") {
  return JSON.stringify({
    verdicts: [
      {
        claimId: "c1",
        verdict,
        explanation: "e",
        quotes,
        alternativeInterpretation: "",
        missingContext: "",
        consequence: "HIGH",
        manualTest: { steps: ["Sign in as B"], expected: "B can't see A's notes" },
      },
    ],
  });
}

describe("handleExtract", () => {
  it("rejects any request that carries source files, before calling the AI", async () => {
    const { provider, calls } = scripted();
    const r = await handleExtract({ explanation, card: "data-access", files }, { provider });
    expect(r.status).toBe(400);
    expect((r.body as { error: string }).error).toBe("code_not_allowed");
    expect(calls).toHaveLength(0);
  });

  it("rejects unknown keys and too-short explanations", async () => {
    const { provider } = scripted();
    expect((await handleExtract({ explanation, card: "x", code: "..." }, { provider })).status).toBe(400);
    expect((await handleExtract({ explanation: "short", card: "x" }, { provider })).status).toBe(400);
    expect((await handleExtract(null, { provider })).status).toBe(400);
  });

  it("sends only the explanation to the model and marks untraceable claims", async () => {
    const { provider, calls } = scripted(
      JSON.stringify({
        claims: [
          { text: "Notes are stored in Supabase", sourceSpan: "it goes into Supabase", category: "data" },
          { text: "Notes are encrypted", sourceSpan: "notes are encrypted at rest", category: "data" },
        ],
        unexplained: [
          { phrase: "I think the login handles that", question: "What stops other users?" },
          { phrase: "a phrase the user never said", question: "?" },
        ],
      }),
    );
    const r = await handleExtract({ explanation, card: "data-access", context: "Supabase" }, { provider });
    expect(r.status).toBe(200);
    const body = r.body as { claims: { id: string; traceable: boolean }[]; unexplained: unknown[]; mode: string };
    expect(body.claims.map((c) => [c.id, c.traceable])).toEqual([
      ["c1", true],
      ["c2", false],
    ]);
    expect(body.unexplained).toHaveLength(1);
    const sent = calls[0]!;
    expect(sent.stage).toBe("extract");
    expect(sent.user).toContain(explanation);
    expect(sent.user).not.toContain("listNotes");
    expect(JSON.stringify(sent.request)).not.toContain("files");
  });

  it("retries once on malformed output, then succeeds", async () => {
    const { provider, calls } = scripted("not json at all", JSON.stringify({ claims: [], unexplained: [] }));
    const r = await handleExtract({ explanation, card: "data-access" }, { provider });
    expect(r.status).toBe(200);
    expect(calls).toHaveLength(2);
  });

  it("returns an error, never partial data, after two malformed responses", async () => {
    const { provider } = scripted('{"claims": "oops"}', '{"claims": [{"text": 1}]}');
    const r = await handleExtract({ explanation, card: "data-access" }, { provider });
    expect(r.status).toBe(502);
    expect(r.body).toMatchObject({ error: "malformed_ai_response" });
    expect(r.body).not.toHaveProperty("claims");
  });

  it("accepts JSON wrapped in a markdown fence", async () => {
    const { provider } = scripted('```json\n{"claims": [], "unexplained": []}\n```');
    expect((await handleExtract({ explanation, card: "data-access" }, { provider })).status).toBe(200);
  });

  it("maps provider quota errors to 429 and does not retry", async () => {
    const { provider, calls } = scripted(new ProviderError("quota", "quota"));
    const r = await handleExtract({ explanation, card: "data-access" }, { provider });
    expect(r.status).toBe(429);
    expect(calls).toHaveLength(1);
  });

  it("times out slow providers", async () => {
    const provider: AiProvider = {
      ...scripted().provider,
      complete: (_i, signal) => new Promise((_res, rej) => signal.addEventListener("abort", () => rej(new Error("aborted")))),
    };
    const r = await handleExtract({ explanation, card: "data-access" }, { provider, timeoutMs: 20 });
    expect(r.status).toBe(504);
  });

  it("enforces the rate limit", async () => {
    const limiter = new RateLimiter(1, 60_000);
    const ok = JSON.stringify({ claims: [], unexplained: [] });
    const { provider } = scripted(ok, ok);
    expect((await handleExtract({ explanation, card: "x" }, { provider, limiter, ip: "1" })).status).toBe(200);
    expect((await handleExtract({ explanation, card: "x" }, { provider, limiter, ip: "1" })).status).toBe(429);
    expect((await handleExtract({ explanation, card: "x" }, { provider, limiter, ip: "2" })).status).toBe(200);
  });
});

describe("handleCheck", () => {
  it("shows a verified contradiction with line numbers computed in code", async () => {
    const { provider, calls } = scripted(verdictJson([{ file: "notes.ts", text: "return supabase.from('notes').select('*');" }]));
    const r = await handleCheck({ claims, files }, { provider });
    expect(r.status).toBe(200);
    const v = (r.body as { verdicts: CheckedVerdict[] }).verdicts[0]!;
    expect(v.verdict).toBe("CONTRADICTED");
    expect(v.evidence[0]!.location).toEqual({ file: "notes.ts", lineStart: 2, lineEnd: 2 });
    expect(calls[0]!.user).toContain("[c1]");
    expect(calls[0]!.user).toContain("<<<FILE notes.ts");
  });

  it("downgrades a verdict whose only quote is fabricated", async () => {
    const { provider } = scripted(verdictJson([{ file: "notes.ts", text: ".eq('user_id', auth.uid())" }], "SUPPORTED"));
    const r = await handleCheck({ claims, files }, { provider });
    const v = (r.body as { verdicts: CheckedVerdict[] }).verdicts[0]!;
    expect(v.verdict).toBe("NOT_VERIFIABLE");
    expect(v.proposedVerdict).toBe("SUPPORTED");
    expect(v.evidence).toEqual([]);
    expect(v.rejectedQuotes[0]!.status).toBe("not_found");
  });

  it("downgrades a real quote attributed to the wrong file", async () => {
    const { provider } = scripted(verdictJson([{ file: "other.ts", text: "return supabase.from('notes').select('*');" }]));
    const v = ((await handleCheck({ claims, files }, { provider })).body as { verdicts: CheckedVerdict[] }).verdicts[0]!;
    expect(v.verdict).toBe("NOT_VERIFIABLE");
    expect(v.rejectedQuotes[0]!.status).toBe("wrong_file");
  });

  it("rejects malformed verdicts (bad enum) after one retry", async () => {
    const bad = verdictJson([], "PROBABLY_FINE");
    const { provider, calls } = scripted(bad, bad);
    const r = await handleCheck({ claims, files }, { provider });
    expect(r.status).toBe(502);
    expect(calls).toHaveLength(2);
  });

  it("validates files and claims before calling the AI", async () => {
    const { provider, calls } = scripted();
    expect((await handleCheck({ claims, files: [{ name: "x.png", content: "x" }] }, { provider })).status).toBe(400);
    expect((await handleCheck({ claims: [], files }, { provider })).status).toBe(400);
    expect((await handleCheck({ claims: [...claims, ...claims], files }, { provider })).status).toBe(400);
    expect(calls).toHaveLength(0);
  });
});

describe("demo provider", () => {
  const demo = createDemoProvider();

  it("runs the bundled sample end to end, and the safeguards catch its planted bad quotes", async () => {
    const ex = await handleExtract({ explanation: SAMPLE_EXPLANATION, card: "data-access", context: SAMPLE_CONTEXT }, { provider: demo });
    expect(ex.status).toBe(200);
    const exBody = ex.body as { mode: string; claims: { id: string; text: string; category: "data"; traceable: boolean }[] };
    expect(exBody.mode).toBe("demo");
    expect(exBody.claims.every((c) => c.traceable)).toBe(true);

    const ck = await handleCheck(
      { claims: exBody.claims.map(({ id, text, category }) => ({ id, text, category })), files: SAMPLE_FILES, context: SAMPLE_CONTEXT },
      { provider: demo },
    );
    expect(ck.status).toBe(200);
    const body = ck.body as { verdicts: CheckedVerdict[]; summary: Record<string, number> };
    expect(body.verdicts.map((v) => v.verdict)).toEqual(["SUPPORTED", "CONTRADICTED", "CONTRADICTED", "NOT_VERIFIABLE"]);
    // c2: the policy quote verifies, the short `select("*")` is rejected
    expect(body.verdicts[1]!.evidence).toHaveLength(1);
    expect(body.verdicts[1]!.rejectedQuotes[0]!.status).toBe("too_short");
    // c3: both quotes verify across two files
    expect(body.verdicts[2]!.evidence.map((e) => e.location!.file)).toEqual(["src/lib/notes.ts", "src/components/NoteEditor.tsx"]);
    // c4: the fabricated key quote is rejected and the verdict downgraded
    expect(body.verdicts[3]!.downgradeReason).toBe("no_verified_evidence");
    expect(body.summary).toMatchObject({ supported: 1, contradicted: 2, notVerifiable: 1, downgraded: 1, rejectedQuotes: 2 });
  });

  it("never pretends to analyse non-sample code", async () => {
    const ck = await handleCheck({ claims, files }, { provider: demo });
    const v = (ck.body as { verdicts: CheckedVerdict[] }).verdicts[0]!;
    expect(v.verdict).toBe("NOT_VERIFIABLE");
    expect(v.explanation).toMatch(/Demo mode/);
  });
});

describe("provider selection and Gemini adapter", () => {
  it("uses demo without a key, or when forced", () => {
    expect(selectProvider({}).id).toBe("demo");
    expect(selectProvider({ GEMINI_API_KEY: "k", HANDWAVE_MODE: "demo" }).id).toBe("demo");
    expect(selectProvider({ GEMINI_API_KEY: "k" }).id).toBe("gemini");
  });

  it("sends the key in a header, the schema as structured output, and reads the text back", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"a":1}' }] } }] }), { status: 200 }));
    const gemini = createGeminiProvider("secret-key", "gemini-test", fetchMock as unknown as typeof fetch);
    const text = await gemini.complete({ stage: "extract", system: "s", user: "u", jsonSchema: extractJsonSchema, request: { explanation, card: "x", context: "" } }, new AbortController().signal);
    expect(text).toBe('{"a":1}');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("models/gemini-test:generateContent");
    expect(url).not.toContain("secret-key");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("secret-key");
    const sent = JSON.parse(init.body as string);
    expect(sent.generationConfig.responseMimeType).toBe("application/json");
    expect(sent.generationConfig.responseJsonSchema.$schema).toBeUndefined();
  });

  it("removes maxItems from the schema sent to Gemini, but the server still enforces the limits", async () => {
    expect(JSON.stringify(toGeminiSchema(checkJsonSchema))).not.toContain("maxItems");
    expect(JSON.stringify(toGeminiSchema(checkJsonSchema))).toContain('"enum"');
    // Five quotes exceeds the zod limit of four: rejected even though Gemini wasn't told the limit.
    const tooMany = JSON.parse(verdictJson(Array.from({ length: 5 }, () => ({ file: "notes.ts", text: "return supabase.from('notes').select('*');" }))));
    const { provider } = scripted(JSON.stringify(tooMany), JSON.stringify(tooMany));
    expect((await handleCheck({ claims, files }, { provider })).status).toBe(502);
  });

  it("maps HTTP errors to provider errors", async () => {
    for (const [status, kind] of [[429, "quota"], [403, "auth"], [500, "upstream"]] as const) {
      const gemini = createGeminiProvider("k", "m", (async () => new Response("{}", { status })) as unknown as typeof fetch);
      await expect(gemini.complete({ stage: "check", system: "", user: "", jsonSchema: checkJsonSchema, request: { claims, files, context: "" } }, new AbortController().signal)).rejects.toMatchObject({ kind });
    }
  });
});
