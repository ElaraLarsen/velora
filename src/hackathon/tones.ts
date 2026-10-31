import type { AuditLabel } from "./analysis/audit";
import type { AnswerStatus } from "./analysis/judge";

/** Text colours for the audit labels, from the existing status palette. */
export const AUDIT_TONE: Record<AuditLabel, string> = {
  verified: "text-ok",
  contradicted: "text-bad",
  risk: "text-highlight",
  assumption: "text-ink-2",
  unknown: "text-unk",
};

export const ANSWER_TONE: Record<AnswerStatus, { tone: string; text: string }> = {
  answered: { tone: "text-ok", text: "Answered from evidence" },
  partial: { tone: "text-highlight", text: "Partly answered" },
  unanswered: { tone: "text-unk", text: "Unanswered" },
};
