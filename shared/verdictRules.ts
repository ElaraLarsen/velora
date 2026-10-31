import type { AiVerdict } from "./schemas.js";
import { verifyQuote } from "./quoteVerifier.js";
import type { CheckedVerdict, ConfirmedClaim, SourceFile } from "./types.js";

const EMPTY_TEST = { steps: [] as string[], expected: "" };

/**
 * Turns the model's proposed verdicts into the verdicts Handwave shows.
 * - Every quote is checked against the uploaded files; only verified text survives.
 * - SUPPORTED or CONTRADICTED with no verified quote becomes NOT_VERIFIABLE.
 * - Verdicts for unknown claim ids are dropped; confirmed claims with no verdict become NOT_VERIFIABLE.
 */
export function applyVerdictRules(claims: ConfirmedClaim[], proposed: AiVerdict[], files: SourceFile[]): CheckedVerdict[] {
  const byId = new Map<string, AiVerdict>();
  for (const v of proposed) {
    if (!byId.has(v.claimId)) byId.set(v.claimId, v); // first verdict per claim wins
  }

  return claims.map((claim): CheckedVerdict => {
    const v = byId.get(claim.id);
    if (!v) {
      return {
        claimId: claim.id,
        verdict: "NOT_VERIFIABLE",
        proposedVerdict: null,
        downgradeReason: "no_verdict_returned",
        explanation: "The analysis returned no verdict for this claim.",
        evidence: [],
        rejectedQuotes: [],
        alternativeInterpretation: "",
        missingContext: "",
        consequence: "NONE",
        manualTest: EMPTY_TEST,
      };
    }

    const checks = v.quotes.map((q) => verifyQuote(q.text, q.file, files));
    const evidence = checks.filter((c) => c.status === "verified");
    const rejectedQuotes = checks.filter((c) => c.status !== "verified");

    const needsEvidence = v.verdict === "SUPPORTED" || v.verdict === "CONTRADICTED";
    const downgraded = needsEvidence && evidence.length === 0;
    const verdict = downgraded ? "NOT_VERIFIABLE" : v.verdict;

    return {
      claimId: claim.id,
      verdict,
      proposedVerdict: v.verdict,
      ...(downgraded ? { downgradeReason: "no_verified_evidence" as const } : {}),
      explanation: v.explanation,
      evidence,
      rejectedQuotes,
      alternativeInterpretation: v.alternativeInterpretation,
      missingContext: v.missingContext,
      // A consequence rating only means something for a genuine contradiction.
      consequence: verdict === "CONTRADICTED" ? v.consequence : "NONE",
      manualTest: v.manualTest,
    };
  });
}

/**
 * Browser-side second check: re-verifies every evidence quote against the files the browser holds,
 * and applies the downgrade rule again. A server bug can't put an unverified quote on screen.
 */
export function reverifyVerdicts(verdicts: CheckedVerdict[], files: SourceFile[]): CheckedVerdict[] {
  return verdicts.map((v) => {
    const rechecked = v.evidence.map((q) => verifyQuote(q.claimedText, q.claimedFile, files));
    const evidence = rechecked.filter((q) => q.status === "verified");
    const rejectedQuotes = [...v.rejectedQuotes, ...rechecked.filter((q) => q.status !== "verified")];
    const needsEvidence = v.verdict === "SUPPORTED" || v.verdict === "CONTRADICTED";
    if (needsEvidence && evidence.length === 0) {
      return { ...v, verdict: "NOT_VERIFIABLE", downgradeReason: "no_verified_evidence", evidence, rejectedQuotes, consequence: "NONE" };
    }
    return { ...v, evidence, rejectedQuotes };
  });
}

export interface VerdictSummary {
  total: number;
  supported: number;
  contradicted: number;
  notVerifiable: number;
  downgraded: number;
  rejectedQuotes: number;
}

export function summarize(verdicts: CheckedVerdict[]): VerdictSummary {
  return {
    total: verdicts.length,
    supported: verdicts.filter((v) => v.verdict === "SUPPORTED").length,
    contradicted: verdicts.filter((v) => v.verdict === "CONTRADICTED").length,
    notVerifiable: verdicts.filter((v) => v.verdict === "NOT_VERIFIABLE").length,
    downgraded: verdicts.filter((v) => v.downgradeReason === "no_verified_evidence").length,
    rejectedQuotes: verdicts.reduce((n, v) => n + v.rejectedQuotes.length, 0),
  };
}
