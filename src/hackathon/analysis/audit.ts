// Claim Audit: the project's claims, labelled from the existing verification engine's results.
// Nothing is re-analysed and no evidence is created here: every label comes from a verdict the
// evidence check already produced (quotes verified against the uploaded files), or from the fact
// that a claim was never checked.

import type { CheckedVerdict, ClaimCategory } from "../../../shared/types";
import type { Project } from "../../project/types";

export type AuditLabel = "verified" | "contradicted" | "risk" | "assumption" | "unknown";

export const AUDIT_LABEL: Record<AuditLabel, { text: string; meaning: string }> = {
  verified: { text: "Verified", meaning: "Supported by a quote verified in the uploaded code." },
  contradicted: { text: "Contradicted", meaning: "A quote verified in the uploaded code shows otherwise." },
  risk: { text: "Potential risk", meaning: "Not shown either way by the uploaded code, and it concerns data, access, secrets, cost or failures." },
  assumption: { text: "Assumption", meaning: "Stated by you, not checked against the code yet." },
  unknown: { text: "Unknown", meaning: "Not shown either way by the uploaded code." },
};

/** Categories where an unproven claim is a risk, not just an open question. */
const RISK_CATEGORIES: ClaimCategory[] = ["data", "access", "secrets", "cost", "failure"];

export interface AuditItem {
  claimId: string;
  text: string;
  category: ClaimCategory;
  label: AuditLabel;
  reason: string;
  /** Present for checked claims: the verdict, with its verified evidence. */
  verdict?: CheckedVerdict;
}

export interface AuditReport {
  items: AuditItem[];
  counts: Record<AuditLabel, number>;
  /** False when results exist but were produced for a different set of files. */
  current: boolean;
}

export function auditClaims(project: Project): AuditReport {
  const { studio } = project;
  const current = studio.verdictsDigest === null || studio.verdictsDigest === project.filesDigest;
  const byId = new Map(studio.verdicts.map((v) => [v.claimId, v]));
  const items: AuditItem[] = [];

  for (const c of studio.checkedClaims) {
    const v = byId.get(c.id);
    if (!v || !current) {
      items.push({ claimId: c.id, text: c.text, category: c.category, label: "unknown", reason: "No current result for this claim." });
      continue;
    }
    const where = v.evidence[0]?.location ? `${v.evidence[0].location.file}, line ${v.evidence[0].location.lineStart}` : "";
    if (v.verdict === "SUPPORTED") {
      items.push({ claimId: c.id, text: c.text, category: c.category, label: "verified", reason: `Supported by verified evidence${where ? ` in ${where}` : ""}.`, verdict: v });
    } else if (v.verdict === "CONTRADICTED") {
      items.push({ claimId: c.id, text: c.text, category: c.category, label: "contradicted", reason: `Verified evidence${where ? ` in ${where}` : ""} shows otherwise.`, verdict: v });
    } else {
      const risk = RISK_CATEGORIES.includes(c.category);
      items.push({
        claimId: c.id, text: c.text, category: c.category, label: risk ? "risk" : "unknown", verdict: v,
        reason: risk
          ? `The uploaded code doesn't show this either way, and it concerns ${c.category}: worth testing before anyone relies on it.`
          : "The uploaded code doesn't show this either way.",
      });
    }
  }

  // Claims you kept but that were never sent to the evidence check (or were edited since).
  const checked = new Set(studio.checkedClaims.map((c) => c.id));
  for (const c of studio.claims) {
    if (c.status === "deleted" || checked.has(c.id) || c.text.trim().length < 3) continue;
    items.push({
      claimId: c.id, text: c.text.trim(), category: c.category, label: "assumption",
      reason: c.status === "confirmed" ? "Confirmed by you, not yet checked against the code." : "Not confirmed or checked yet.",
    });
  }

  const counts = { verified: 0, contradicted: 0, risk: 0, assumption: 0, unknown: 0 } as Record<AuditLabel, number>;
  for (const i of items) counts[i.label]++;
  return { items, counts, current };
}
