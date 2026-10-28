import { SAMPLE_CHECK_RESPONSE, SAMPLE_EXPLANATION, SAMPLE_EXTRACT_RESPONSE, isSampleProject } from "../shared/sample";
import type { CheckRequest, ExtractRequest } from "../shared/schemas";
import type { ClaimCategory } from "../shared/types";

export type Stage = "extract" | "check";

export type StageInput =
  | { stage: "extract"; system: string; user: string; jsonSchema: object; request: ExtractRequest }
  | { stage: "check"; system: string; user: string; jsonSchema: object; request: CheckRequest };

/** One AI provider. Returns the model's raw text; validation happens in the handlers, the same way for every provider. */
export interface AiProvider {
  id: "gemini" | "demo";
  label: string;
  model: string;
  live: boolean;
  complete(input: StageInput, signal: AbortSignal): Promise<string>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly kind: "quota" | "auth" | "upstream" | "blocked",
  ) {
    super(message);
  }
}

// ---------------- Gemini ----------------

/**
 * Adapts a zod JSON Schema for Gemini: drops the $schema marker and `maxItems`, which Gemini rejected
 * with HTTP 400 "invalid argument" on the check schema (bisected 2026-10-28). The zod schemas still
 * enforce every array limit when the response is validated, so nothing is loosened.
 */
export function toGeminiSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toGeminiSchema);
  if (schema && typeof schema === "object") {
    return Object.fromEntries(
      Object.entries(schema)
        .filter(([k]) => k !== "$schema" && k !== "maxItems")
        .map(([k, v]) => [k, toGeminiSchema(v)]),
    );
  }
  return schema;
}

export function createGeminiProvider(apiKey: string, model: string, fetchImpl: typeof fetch = fetch): AiProvider {
  return {
    id: "gemini",
    label: "Google Gemini",
    model,
    live: true,
    async complete(input, signal) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const res = await fetchImpl(url, {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: input.system }] },
          contents: [{ role: "user", parts: [{ text: input.user }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            responseJsonSchema: toGeminiSchema(input.jsonSchema),
          },
        }),
      });
      if (res.status === 429) throw new ProviderError("Gemini rate limit or free-tier quota reached.", "quota");
      if (res.status === 401 || res.status === 403) throw new ProviderError("Gemini rejected the API key.", "auth");
      if (!res.ok) {
        // Google's error messages explain things like retired models; they never echo the key.
        const detail = await res
          .json()
          .then((b: { error?: { message?: string } }) => b.error?.message ?? "")
          .catch(() => "");
        throw new ProviderError(`Gemini returned HTTP ${res.status}${detail ? `: ${detail.slice(0, 300)}` : "."}`, "upstream");
      }
      const json = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
        promptFeedback?: { blockReason?: string };
      };
      if (json.promptFeedback?.blockReason) throw new ProviderError(`Gemini blocked the request (${json.promptFeedback.blockReason}).`, "blocked");
      // Thinking models may return thought-summary parts; only the answer parts are JSON.
      const text =
        json.candidates?.[0]?.content?.parts
          ?.filter((p) => !p.thought)
          .map((p) => p.text ?? "")
          .join("") ?? "";
      return text;
    },
  };
}

// ---------------- Demo ----------------

function guessCategory(sentence: string): ClaimCategory {
  const s = sentence.toLowerCase();
  if (/\b(key|secret|token|password|env)\b/.test(s)) return "secrets";
  if (/\b(cost|pay|charge|billing|credit|limit)\b/.test(s)) return "cost";
  if (/\b(fail|error|offline|crash|timeout)\b/.test(s)) return "failure";
  if (/\b(only|can see|access|login|log in|logged|private|public|permission)\b/.test(s)) return "access";
  if (/\b(save|store|database|table|upload|delete)\b/.test(s)) return "data";
  return "behavior";
}

/**
 * Demo provider: deterministic, no AI. For the bundled sample project it returns canned model output.
 * For anything else it splits sentences (extraction) and refuses to judge (check). The UI labels all of it as demo.
 */
export function createDemoProvider(): AiProvider {
  return {
    id: "demo",
    label: "Demo mode (no AI)",
    model: "none",
    live: false,
    async complete(input) {
      if (input.stage === "extract") {
        const explanation = input.request.explanation.trim();
        if (explanation === SAMPLE_EXPLANATION) return JSON.stringify(SAMPLE_EXTRACT_RESPONSE);
        const sentences = explanation
          .split(/(?<=[.!?])\s+/)
          .map((s) => s.trim())
          .filter((s) => s.split(/\s+/).length >= 4)
          .slice(0, 12);
        return JSON.stringify({
          claims: sentences.map((s) => ({ text: s, sourceSpan: s, category: guessCategory(s) })),
          unexplained: [],
        });
      }
      if (isSampleProject(input.request.files)) return JSON.stringify(SAMPLE_CHECK_RESPONSE);
      return JSON.stringify({
        verdicts: input.request.claims.map((c) => ({
          claimId: c.id,
          verdict: "NOT_VERIFIABLE",
          explanation: "Demo mode: no AI analysis was run, so this claim was not checked.",
          quotes: [],
          alternativeInterpretation: "",
          missingContext: "Add a Gemini API key to check claims against your code.",
          consequence: "NONE",
          manualTest: { steps: ["Test this behaviour in your running app."], expected: "" },
        })),
      });
    },
  };
}

export interface ServerEnv {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  HANDWAVE_MODE?: string;
}

// gemini-2.5-flash is closed to new API users (Google's 404 message, 2026-10-28).
// Measured on the free tier that day: 3.5-flash-lite answered in ~2s; 3.8-flash took over 60s for a one-line prompt.
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

/** Live only when a key is configured and demo isn't forced. A live provider never falls back to demo on failure. */
export function selectProvider(env: ServerEnv): AiProvider {
  if (env.HANDWAVE_MODE !== "demo" && env.GEMINI_API_KEY) {
    return createGeminiProvider(env.GEMINI_API_KEY, env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL);
  }
  return createDemoProvider();
}
