import type { z } from "zod";
import { spanInText } from "../shared/quoteVerifier.js";
import {
  CheckRequest,
  CheckResponse,
  ExtractRequest,
  ExtractResponse,
  checkJsonSchema,
  extractJsonSchema,
  parseModelJson,
} from "../shared/schemas";
import { validateSourceFiles } from "../shared/sourceFiles.js";
import { applyVerdictRules, summarize } from "../shared/verdictRules.js";
import { CHECK_SYSTEM, EXTRACT_SYSTEM, checkUserPrompt, extractUserPrompt } from "./prompts.js";
import { ProviderError, type AiProvider, type StageInput } from "./providers.js";
import type { RateLimiter } from "./rateLimit.js";

export interface ApiResult {
  status: number;
  body: unknown;
}

export interface HandlerDeps {
  provider: AiProvider;
  limiter?: RateLimiter;
  ip?: string;
  timeoutMs?: number;
}

export function modeInfo(provider: AiProvider) {
  return { mode: provider.live ? "live" : "demo", provider: provider.label, model: provider.model } as const;
}

function error(status: number, code: string, message: string, extra: Record<string, unknown> = {}): ApiResult {
  return { status, body: { error: code, message, ...extra } };
}

function zodMessage(err: z.ZodError): string {
  return err.issues.map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message)).join("; ");
}

/**
 * Calls the provider and validates its output against the schema. One retry on malformed output.
 * Never returns unvalidated model output.
 */
async function callValidated<T>(deps: HandlerDeps, input: StageInput, schema: z.ZodType<T>): Promise<{ ok: true; value: T } | { ok: false; result: ApiResult }> {
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? 60_000);
    let raw: string;
    try {
      raw = await deps.provider.complete(input, controller.signal);
    } catch (e) {
      if (controller.signal.aborted) return { ok: false, result: error(504, "provider_timeout", "The AI provider took too long to answer. Try again.") };
      if (e instanceof ProviderError) {
        const status = e.kind === "quota" ? 429 : 502;
        return { ok: false, result: error(status, `provider_${e.kind}`, e.message) };
      }
      return { ok: false, result: error(502, "provider_error", "Could not reach the AI provider.") };
    } finally {
      clearTimeout(timer);
    }
    const parsed = parseModelJson(raw, schema);
    if (parsed.ok) return parsed;
    lastError = parsed.error;
  }
  return {
    ok: false,
    result: error(502, "malformed_ai_response", "The AI returned a response Velora could not validate, twice. Nothing is shown rather than a partial result.", { detail: lastError }),
  };
}

function rateLimited(deps: HandlerDeps): ApiResult | null {
  if (deps.limiter && !deps.limiter.take(deps.ip ?? "unknown")) {
    return error(429, "rate_limited", "Too many checks from this connection. Wait a few minutes and try again.");
  }
  return null;
}

export async function handleExtract(body: unknown, deps: HandlerDeps): Promise<ApiResult> {
  if (body && typeof body === "object" && "files" in body) {
    return error(400, "code_not_allowed", "Claim extraction never receives source code. Remove the files from this request.");
  }
  const req = ExtractRequest.safeParse(body);
  if (!req.success) return error(400, "invalid_request", zodMessage(req.error));
  const limited = rateLimited(deps);
  if (limited) return limited;

  const out = await callValidated(
    deps,
    { stage: "extract", system: EXTRACT_SYSTEM, user: extractUserPrompt(req.data), jsonSchema: extractJsonSchema, request: req.data },
    ExtractResponse,
  );
  if (!out.ok) return out.result;

  const claims = out.value.claims.map((c, i) => ({
    id: `c${i + 1}`,
    text: c.text,
    sourceSpan: c.sourceSpan,
    category: c.category,
    // A claim whose source phrase isn't in the explanation may be the model's invention.
    traceable: spanInText(c.sourceSpan, req.data.explanation),
  }));
  const unexplained = out.value.unexplained.filter((u) => spanInText(u.phrase, req.data.explanation));
  return { status: 200, body: { ...modeInfo(deps.provider), claims, unexplained } };
}

export async function handleCheck(body: unknown, deps: HandlerDeps): Promise<ApiResult> {
  const req = CheckRequest.safeParse(body);
  if (!req.success) return error(400, "invalid_request", zodMessage(req.error));
  const problems = validateSourceFiles(req.data.files);
  if (problems.length) return error(400, "invalid_files", problems.map((p) => (p.file ? `${p.file}: ${p.message}` : p.message)).join("; "));
  const ids = new Set(req.data.claims.map((c) => c.id));
  if (ids.size !== req.data.claims.length) return error(400, "invalid_request", "Claim ids must be unique.");
  const limited = rateLimited(deps);
  if (limited) return limited;

  const out = await callValidated(
    deps,
    { stage: "check", system: CHECK_SYSTEM, user: checkUserPrompt(req.data), jsonSchema: checkJsonSchema, request: req.data },
    CheckResponse,
  );
  if (!out.ok) return out.result;

  // Source code is used for this request only and is not stored anywhere.
  const verdicts = applyVerdictRules(req.data.claims, out.value.verdicts, req.data.files);
  return { status: 200, body: { ...modeInfo(deps.provider), verdicts, summary: summarize(verdicts) } };
}
