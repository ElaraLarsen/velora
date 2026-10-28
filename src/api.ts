import type { ClaimCategory, CheckedVerdict, ConfirmedClaim, SourceFile } from "../shared/types";
import type { VerdictSummary } from "../shared/verdictRules";

export interface ModeInfo {
  mode: "live" | "demo";
  provider: string;
  model: string;
}

export interface ExtractedClaim {
  id: string;
  text: string;
  sourceSpan: string;
  category: ClaimCategory;
  traceable: boolean;
}

export interface ExtractResult extends ModeInfo {
  claims: ExtractedClaim[];
  unexplained: { phrase: string; question: string }[];
}

export interface CheckResult extends ModeInfo {
  verdicts: CheckedVerdict[];
  summary: VerdictSummary;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  } catch {
    throw new ApiError("Couldn't reach the Handwave server. Check your connection and try again.", "network");
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new ApiError(`The server returned an unreadable response (HTTP ${res.status}).`, "bad_response");
  }
  if (!res.ok) {
    const b = body as { message?: string; error?: string };
    throw new ApiError(b.message ?? `Request failed (HTTP ${res.status}).`, b.error ?? "error");
  }
  return body as T;
}

export const api = {
  status: () => request<ModeInfo>("/api/status"),
  /** Sends only the explanation. Source files are never part of this request. */
  extract: (explanation: string, card: string, context: string) =>
    request<ExtractResult>("/api/extract", { method: "POST", body: JSON.stringify({ explanation, card, context }) }),
  check: (claims: ConfirmedClaim[], files: SourceFile[], context: string) =>
    request<CheckResult>("/api/check", { method: "POST", body: JSON.stringify({ claims, files, context }) }),
};
