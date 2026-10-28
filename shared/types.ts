// Types shared by the browser and the server functions.

export type Verdict = "SUPPORTED" | "CONTRADICTED" | "NOT_VERIFIABLE";
export type Consequence = "HIGH" | "MEDIUM" | "LOW" | "NONE";
export type ClaimCategory = "data" | "access" | "failure" | "cost" | "secrets" | "behavior";

export interface SourceFile {
  name: string;
  content: string;
}

/** A claim as the user confirmed it. Only these are ever sent to the evidence check. */
export interface ConfirmedClaim {
  id: string;
  text: string;
  category: ClaimCategory;
}

/** Where a quote was found in the uploaded source. Line numbers are 1-based and computed in code. */
export interface QuoteLocation {
  file: string;
  lineStart: number;
  lineEnd: number;
}

export type QuoteStatus =
  | "verified" // found in the file the AI cited
  | "not_found" // not present in any uploaded file
  | "wrong_file" // present, but not in the file the AI cited
  | "too_short"; // too little text to count as evidence

export interface QuoteCheck {
  status: QuoteStatus;
  /** The AI's quote, as it sent it. Never displayed as evidence. */
  claimedText: string;
  claimedFile: string;
  /** Exact text cut from the uploaded file. This is the only quote text the UI shows. */
  sourceText?: string;
  /** The complete source lines the quote spans, for display. Also cut from the file. */
  linesText?: string;
  location?: QuoteLocation;
  /** Every place the quote occurs in the cited file. */
  occurrences: QuoteLocation[];
  match?: "exact" | "whitespace";
}

export type DowngradeReason = "no_verified_evidence" | "no_verdict_returned";

export interface CheckedVerdict {
  claimId: string;
  /** Verdict after the deterministic rules ran. */
  verdict: Verdict;
  /** Verdict the AI proposed, kept for transparency. */
  proposedVerdict: Verdict | null;
  downgradeReason?: DowngradeReason;
  explanation: string;
  evidence: QuoteCheck[]; // verified quotes only
  rejectedQuotes: QuoteCheck[]; // every quote that failed verification
  alternativeInterpretation: string;
  missingContext: string;
  consequence: Consequence;
  manualTest: { steps: string[]; expected: string };
}
