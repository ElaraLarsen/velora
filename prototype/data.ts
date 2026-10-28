// Prototype data. The claims and the AI's proposed verdicts are Handwave's canned demo output
// for its fictional sample project. Quote checks, line numbers, downgrades and the fix prompt
// are computed here by Handwave's real shared logic, exactly as the app does.
import { buildFixPrompt } from "../shared/fixPrompt";
import { segmentHedges } from "../shared/hedges";
import { SAMPLE_CHECK_RESPONSE, SAMPLE_CONTEXT, SAMPLE_EXPLANATION, SAMPLE_EXTRACT_RESPONSE, SAMPLE_FILES } from "../shared/sample";
import type { AiVerdict } from "../shared/schemas";
import type { CheckedVerdict, ConfirmedClaim, SourceFile } from "../shared/types";
import { applyVerdictRules, summarize } from "../shared/verdictRules";

export const FILES: SourceFile[] = SAMPLE_FILES;
export const CONTEXT = SAMPLE_CONTEXT;
export const EXPLANATION = SAMPLE_EXPLANATION;
export const EXPLANATION_SEGMENTS = segmentHedges(SAMPLE_EXPLANATION);

export interface DemoClaim extends ConfirmedClaim {
  sourceSpan: string;
}

export const CLAIMS: DemoClaim[] = SAMPLE_EXTRACT_RESPONSE.claims.map((c, i) => ({
  id: `c${i + 1}`,
  text: c.text,
  category: c.category as ConfirmedClaim["category"],
  sourceSpan: c.sourceSpan,
}));

export const UNEXPLAINED = SAMPLE_EXTRACT_RESPONSE.unexplained;

export function checkClaims(confirmed: DemoClaim[]): CheckedVerdict[] {
  const proposed = SAMPLE_CHECK_RESPONSE.verdicts.filter((v) => confirmed.some((c) => c.id === v.claimId));
  return applyVerdictRules(confirmed, proposed as AiVerdict[], FILES);
}

export { summarize };
export { PROMISE_CARDS } from "../shared/cards";
export { findHedges, segmentHedges } from "../shared/hedges";
export { LIMITS, countLines, validateSourceFiles } from "../shared/sourceFiles";

export function fixPrompt(claim: DemoClaim, verdict: CheckedVerdict, observation: string) {
  return buildFixPrompt({ claim, verdict, observation });
}

export function fileLines(name: string): string[] {
  return (FILES.find((f) => f.name === name)?.content ?? "").replace(/\r\n/g, "\n").split("\n");
}

export const fmtBytes = (n: number) => (n < 1000 ? `${n} B` : `${(n / 1000).toFixed(1)} KB`);
export const byteLength = (s: string) => new TextEncoder().encode(s).length;
