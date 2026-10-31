// Readiness Dashboard: where the project stands, from the shared project state only.

import { LIMITS } from "../../../shared/sourceFiles";
import type { Project } from "../../project/types";
import { auditClaims, type AuditItem } from "./audit";
import { isDocFile } from "./stack";

export type CheckStatus = "done" | "todo" | "warn";

export interface ReadinessCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface EvidenceGap {
  claimId: string;
  text: string;
  rejectedQuotes: number;
  downgraded: boolean;
}

export interface ReadinessReport {
  completeness: ReadinessCheck[];
  missingDocs: { label: string; present: boolean; files: string[] }[];
  unverified: AuditItem[];
  evidenceGaps: EvidenceGap[];
  demo: ReadinessCheck[];
}

const bytes = (s: string) => new TextEncoder().encode(s).length;

export function readiness(project: Project, live: boolean): ReadinessReport {
  const { files, context, studio } = project;
  const audit = auditClaims(project);
  const total = files.reduce((n, f) => n + bytes(f.content), 0);
  const current = studio.verdicts.length > 0 && studio.verdictsDigest === project.filesDigest;
  const confirmed = studio.claims.filter((c) => c.status === "confirmed").length;
  const contradicted = studio.verdicts.filter((v) => v.verdict === "CONTRADICTED");
  const ruled = contradicted.filter((v) => (studio.findings[v.claimId]?.status ?? "untested") !== "untested");

  const completeness: ReadinessCheck[] = [
    files.length
      ? { id: "files", label: "Source files loaded", status: "done", detail: `${files.length} of ${LIMITS.maxFiles} files, ${(total / 1000).toFixed(1)} KB of ${LIMITS.maxTotalBytes / 1000} KB.` }
      : { id: "files", label: "Source files loaded", status: "todo", detail: "No files yet. Load them in Studio, step 1." },
    { id: "context", label: "Setup described", status: context.trim() ? "done" : "todo", detail: context.trim() ? `“${context.trim()}”` : "Optional, but it helps: say how the app is set up." },
    { id: "explanation", label: "Feature explained", status: studio.explanation.trim().length >= 20 ? "done" : "todo", detail: studio.explanation.trim().length >= 20 ? "Explained in your own words." : "Explain the feature in Studio, step 2." },
    { id: "claims", label: "Claims confirmed", status: confirmed ? "done" : "todo", detail: confirmed ? `${confirmed} claim${confirmed === 1 ? "" : "s"} confirmed.` : "Confirm the claims you believe in Studio, step 3." },
    { id: "check", label: "Evidence check run", status: current ? "done" : "todo", detail: current ? `${studio.verdicts.length} claim${studio.verdicts.length === 1 ? "" : "s"} checked against the current files.` : "Run the evidence check in Studio, step 3." },
    contradicted.length
      ? { id: "tested", label: "Contradictions tested", status: ruled.length === contradicted.length ? "done" : "todo", detail: `${ruled.length} of ${contradicted.length} tested in your running app (Studio, step 5).` }
      : { id: "tested", label: "Contradictions tested", status: current ? "done" : "todo", detail: current ? "No contradicted claims to test." : "Available after the evidence check." },
  ];

  const docs: { label: string; test: (n: string) => boolean }[] = [
    { label: "README or setup instructions", test: (n) => isDocFile(n) && /readme/i.test(n) },
    { label: "Dependency manifest (package.json, requirements.txt, pyproject.toml, go.mod)", test: (n) => /(^|\/)(package\.json|requirements\.txt|pyproject\.toml|go\.mod|Gemfile|Cargo\.toml)$/i.test(n) },
    { label: "Environment example (.env.example)", test: (n) => /(^|\/)\.?env\.example$/i.test(n) },
  ];
  const missingDocs = docs.map((d) => {
    const hits = files.map((f) => f.name).filter(d.test);
    return { label: d.label, present: hits.length > 0, files: hits };
  });

  const evidenceGaps = studio.verdicts
    .filter((v) => v.rejectedQuotes.length > 0 || v.downgradeReason)
    .map((v) => ({ claimId: v.claimId, text: studio.checkedClaims.find((c) => c.id === v.claimId)?.text ?? v.claimId, rejectedQuotes: v.rejectedQuotes.length, downgraded: Boolean(v.downgradeReason) }));

  const highOpen = contradicted.filter((v) => v.consequence === "HIGH" && studio.findings[v.claimId]?.status !== "false_alarm");
  const secrets = audit.items.filter((i) => i.category === "secrets");
  const demo: ReadinessCheck[] = [
    { id: "live", label: "Results from a live analysis", status: live ? "done" : "warn", detail: live ? "Checked by the configured AI provider and Velora's quote checks." : "Demo mode: results are sample responses, not an analysis of your code. Re-run with a live key before relying on them." },
    { id: "current", label: "Results match the files you'll show", status: current ? "done" : "todo", detail: current ? "Checked against exactly the files loaded now." : "No current evidence check for these files." },
    { id: "high", label: "No open high-consequence contradiction", status: !current ? "todo" : highOpen.length ? "warn" : "done", detail: !current ? "Available after the evidence check." : highOpen.length ? `${highOpen.length} high-consequence claim${highOpen.length === 1 ? " is" : "s are"} contradicted by the code. Fix or disclose before the demo.` : "None found in the checked claims." },
    { id: "manual", label: "Contradictions tested in the running app", status: !contradicted.length ? (current ? "done" : "todo") : ruled.length === contradicted.length ? "done" : "todo", detail: contradicted.length ? `${ruled.length} of ${contradicted.length} ruled on in Studio, step 5.` : current ? "Nothing contradicted." : "Available after the evidence check." },
    { id: "secrets", label: "Secrets handling checked", status: secrets.some((i) => i.label === "verified") ? "done" : secrets.some((i) => i.label === "contradicted") ? "warn" : "todo", detail: secrets.length ? secrets.map((i) => `“${i.text}”: ${i.label}`).join(" ") : "No claim about where secrets live has been made or checked." },
  ];

  return {
    completeness,
    missingDocs,
    unverified: audit.items.filter((i) => i.label === "risk" || i.label === "unknown" || i.label === "assumption"),
    evidenceGaps,
    demo,
  };
}
