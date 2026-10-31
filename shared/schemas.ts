import { z } from "zod";
import { LIMITS } from "./sourceFiles.js";

export const CATEGORIES = ["data", "access", "failure", "cost", "secrets", "behavior"] as const;
export const VERDICTS = ["SUPPORTED", "CONTRADICTED", "NOT_VERIFIABLE"] as const;
export const CONSEQUENCES = ["HIGH", "MEDIUM", "LOW", "NONE"] as const;

// ---------- API requests (strict: unknown keys are rejected) ----------

/** Claim extraction never receives code. `.strict()` makes the server reject a `files` key outright. */
export const ExtractRequest = z
  .object({
    explanation: z.string().trim().min(20, "Say a bit more: at least a sentence or two.").max(6000),
    card: z.string().min(1).max(40),
    context: z.string().max(200).default(""),
  })
  .strict();
export type ExtractRequest = z.infer<typeof ExtractRequest>;

export const SourceFileSchema = z
  .object({
    name: z.string().min(1).max(200),
    content: z.string().max(LIMITS.maxFileBytes),
  })
  .strict();

export const CheckRequest = z
  .object({
    claims: z
      .array(
        z
          .object({
            id: z.string().min(1).max(20),
            text: z.string().trim().min(3).max(400),
            category: z.enum(CATEGORIES),
          })
          .strict(),
      )
      .min(1)
      .max(15),
    files: z.array(SourceFileSchema).min(1).max(LIMITS.maxFiles),
    context: z.string().max(200).default(""),
  })
  .strict();
export type CheckRequest = z.infer<typeof CheckRequest>;

// ---------- AI responses ----------

export const ExtractedClaimSchema = z.object({
  text: z.string().trim().min(3).max(400),
  sourceSpan: z.string().trim().min(1).max(600),
  category: z.enum(CATEGORIES),
});

export const ExtractResponse = z.object({
  claims: z.array(ExtractedClaimSchema).max(15),
  unexplained: z
    .array(z.object({ phrase: z.string().max(300), question: z.string().max(300) }))
    .max(10),
});
export type ExtractResponse = z.infer<typeof ExtractResponse>;

export const AiVerdictSchema = z.object({
  claimId: z.string().min(1).max(20),
  verdict: z.enum(VERDICTS),
  explanation: z.string().max(1200),
  quotes: z.array(z.object({ file: z.string().max(200), text: z.string().max(2000) })).max(4),
  alternativeInterpretation: z.string().max(800),
  missingContext: z.string().max(800),
  consequence: z.enum(CONSEQUENCES),
  manualTest: z.object({
    steps: z.array(z.string().max(300)).min(1).max(6),
    expected: z.string().max(400),
  }),
});

export const CheckResponse = z.object({ verdicts: z.array(AiVerdictSchema).max(30) });
export type CheckResponse = z.infer<typeof CheckResponse>;
export type AiVerdict = z.infer<typeof AiVerdictSchema>;

/** JSON Schemas handed to the model for structured output. Kept in sync with the zod schemas by tests. */
export const extractJsonSchema = z.toJSONSchema(ExtractResponse);
export const checkJsonSchema = z.toJSONSchema(CheckResponse);

/** Parses a model's raw text as JSON and validates it. Returns null on any failure. */
export function parseModelJson<T>(raw: string, schema: z.ZodType<T>): { ok: true; value: T } | { ok: false; error: string } {
  let data: unknown;
  try {
    // Some models wrap JSON in a ```json fence despite instructions.
    const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    data = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "Response was not valid JSON." };
  }
  const result = schema.safeParse(data);
  if (!result.success) return { ok: false, error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  return { ok: true, value: result.data };
}
