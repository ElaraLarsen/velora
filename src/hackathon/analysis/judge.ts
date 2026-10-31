// Judge Q&A Simulator: the questions judges tend to ask, answered only from what the project can
// show. Answers are assembled from verified evidence, checked claims and your own Prove rulings;
// nothing is generated. A question the evidence can't answer is marked unanswered, with what
// would answer it.

import type { CheckedVerdict } from "../../../shared/types";
import type { Project } from "../../project/types";
import { auditClaims, type AuditItem } from "./audit";
import type { EvidenceRef, StackReport } from "./stack";

export type JudgeCategory = "architecture" | "technology" | "security" | "scalability" | "feasibility" | "differentiation" | "limitations" | "failure";

export const JUDGE_CATEGORY: Record<JudgeCategory, string> = {
  architecture: "Technical architecture",
  technology: "Technology choices",
  security: "Security",
  scalability: "Scalability",
  feasibility: "Feasibility",
  differentiation: "Differentiation",
  limitations: "Limitations",
  failure: "Failure scenarios",
};

export type AnswerStatus = "answered" | "partial" | "unanswered";

export interface JudgeQuestion {
  id: string;
  category: JudgeCategory;
  question: string;
  status: AnswerStatus;
  /** Built only from evidence and your own words; never generated. */
  answer: string;
  evidence: EvidenceRef[];
  /** What would answer it, when the evidence can't. */
  prepare?: string;
}

function evidenceOf(v?: CheckedVerdict): EvidenceRef[] {
  return (v?.evidence ?? []).filter((q) => q.location).map((q) => ({ file: q.location!.file, line: q.location!.lineStart, text: (q.sourceText ?? "").split("\n")[0]!.trim() }));
}

/** Answer from the checked claims in some categories: verified and contradicted claims say something; the rest don't. */
function fromClaims(id: string, category: JudgeCategory, question: string, items: AuditItem[], missing: string): JudgeQuestion {
  const said = items.filter((i) => i.label === "verified" || i.label === "contradicted");
  const open = items.filter((i) => i.label !== "verified" && i.label !== "contradicted");
  if (!said.length) {
    return {
      id, category, question, status: "unanswered", evidence: [],
      answer: open.length ? `Your claim${open.length === 1 ? "" : "s"} (${open.map((i) => `“${i.text}”`).join(", ")}) ${open.length === 1 ? "is" : "are"} not shown either way by the uploaded code.` : "No claim about this has been made or checked.",
      prepare: missing,
    };
  }
  const parts = said.map((i) => (i.label === "verified" ? `Supported by the code: “${i.text}”.` : `Contradicted by the code: “${i.text}”. Be ready to say so and how you'll fix it.`));
  return {
    id, category, question, status: open.length ? "partial" : "answered",
    answer: parts.join(" ") + (open.length ? ` Not shown by the code: ${open.map((i) => `“${i.text}”`).join(", ")}.` : ""),
    evidence: said.flatMap((i) => evidenceOf(i.verdict)),
    prepare: open.length ? missing : undefined,
  };
}

/** Relative imports between uploaded files: how the feature's files connect. */
function internalLinks(project: Project): { from: string; to: string; ev: EvidenceRef }[] {
  const names = project.files.map((f) => f.name);
  const strip = (n: string) => n.replace(/\.(tsx?|jsx?|mjs|cjs|vue|svelte)$/, "");
  const links: { from: string; to: string; ev: EvidenceRef }[] = [];
  for (const f of project.files) {
    const dir = f.name.split("/").slice(0, -1);
    f.content.replace(/\r\n?/g, "\n").split("\n").forEach((text, i) => {
      for (const m of text.matchAll(/\bfrom\s+["'](\.{1,2}\/[^"']+)["']|\brequire\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g)) {
        const parts = [...dir];
        for (const seg of (m[1] ?? m[2])!.split("/")) {
          if (seg === "..") parts.pop();
          else if (seg !== ".") parts.push(seg);
        }
        const target = names.find((n) => strip(n) === parts.join("/") || strip(n) === `${parts.join("/")}/index`);
        if (target) links.push({ from: f.name, to: target, ev: { file: f.name, line: i + 1, text: text.trim() } });
      }
    });
  }
  return links;
}

export function judgeQuestions(project: Project, stack: StackReport): JudgeQuestion[] {
  const audit = auditClaims(project).items;
  const cat = (...c: string[]) => audit.filter((i) => c.includes(i.category));
  const qs: JudgeQuestion[] = [];

  // Technical architecture
  const links = internalLinks(project);
  qs.push(project.files.length
    ? {
      id: "arch-files", category: "architecture", question: "Walk us through how this feature is built. Which parts of the code does it use?",
      status: links.length ? "answered" : "partial",
      answer: `The uploaded feature is ${project.files.length} file${project.files.length === 1 ? "" : "s"}: ${project.files.map((f) => f.name).join(", ")}.` +
        (links.length ? ` Connections between them: ${links.map((l) => `${l.from} uses ${l.to}`).join("; ")}.` : " No imports between the uploaded files were found."),
      evidence: links.map((l) => l.ev),
      prepare: links.length ? undefined : "Explain how these files relate; the code alone doesn't connect them.",
    }
    : { id: "arch-files", category: "architecture", question: "Walk us through how this feature is built. Which parts of the code does it use?", status: "unanswered", answer: "No files are loaded.", evidence: [], prepare: "Load the feature's files in Studio." });

  // Technology choices: where each detected framework or integration is used; why is yours to give.
  const tech = stack.items.filter((i) => i.basis === "detected" && (i.kind === "framework" || i.kind === "integration" || i.kind === "data"));
  for (const t of tech.slice(0, 3)) {
    qs.push({
      id: `tech-${t.name}`, category: "technology", question: `Why did you choose ${t.name}, and where is it used?`, status: "partial",
      answer: `Where: ${t.how.toLowerCase()}, in ${[...new Set(t.evidence.map((e) => e.file))].join(", ")}. Why: not something the code shows. That reasoning is yours to give.`,
      evidence: t.evidence.slice(0, 4), prepare: `Prepare one sentence on why ${t.name} fits this project.`,
    });
  }
  const assumed = stack.items.filter((i) => i.basis === "assumption");
  if (!tech.length) {
    qs.push({ id: "tech-none", category: "technology", question: "What is the stack, and why those choices?", status: "unanswered", evidence: [],
      answer: assumed.length ? `Named in your setup but not seen in the uploaded files: ${assumed.map((a) => a.name).join(", ")}.` : "No framework or service was detected in the uploaded files.",
      prepare: "Upload the files that use your main framework and services, or prepare to describe them." });
  }

  // Security, failure scenarios, scalability: from checked claims in those categories.
  qs.push(fromClaims("sec-access", "security", "Who can read or change another user's data?", cat("access", "data"), "Make a claim about who can read the data and check it in Studio; then test it with two accounts."));
  qs.push(fromClaims("sec-secrets", "security", "Where are API keys and other secrets kept? Could a user see them?", cat("secrets"), "Make a claim about where secrets live and check it in Studio; then search the deployed app's page source for keys."));
  qs.push(fromClaims("fail", "failure", "What happens when the network, the database or an AI call fails?", cat("failure"), "Make a claim about failure handling and check it; then test it offline in your running app."));
  const cost = fromClaims("scale-cost", "scalability", "What happens to cost and performance with ten times the users?", cat("cost"), "Static reading of code can't show load or cost at scale. Bring measured numbers or a load test.");
  if (cost.status === "unanswered") cost.answer = `${cost.answer} Static reading of code can't show behaviour under load.`;
  qs.push(cost);

  // Feasibility: only your own tests of the running app answer this.
  const contradicted = project.studio.verdicts.filter((v) => v.verdict === "CONTRADICTED");
  const findings = contradicted.map((v) => ({ v, f: project.studio.findings[v.claimId] }));
  const confirmed = findings.filter((x) => x.f?.status === "confirmed");
  const falseAlarm = findings.filter((x) => x.f?.status === "false_alarm");
  const untested = findings.filter((x) => !x.f || x.f.status === "untested");
  const claimText = (id: string) => project.studio.checkedClaims.find((c) => c.id === id)?.text ?? id;
  qs.push(project.studio.verdicts.length === 0
    ? { id: "feasible", category: "feasibility", question: "Does the demo flow actually work end to end?", status: "unanswered", evidence: [], answer: "Nothing has been checked or tested yet.", prepare: "Run the evidence check, then test each contradicted claim in your running app (Studio, step 5)." }
    : {
      id: "feasible", category: "feasibility", question: "Does the demo flow actually work end to end?",
      status: untested.length ? (confirmed.length || falseAlarm.length ? "partial" : "unanswered") : "answered",
      answer: [
        contradicted.length === 0 ? "No checked claim is contradicted by the code. That covers only the claims that were checked, not the whole flow." : "",
        confirmed.length ? `Confirmed in your own testing: ${confirmed.map((x) => `“${claimText(x.v.claimId)}” does not hold`).join("; ")}.` : "",
        falseAlarm.length ? `Ruled a false alarm in your testing: ${falseAlarm.map((x) => `“${claimText(x.v.claimId)}”`).join("; ")}.` : "",
        untested.length ? `Not tested in the running app yet: ${untested.map((x) => `“${claimText(x.v.claimId)}”`).join("; ")}.` : "",
      ].filter(Boolean).join(" "),
      evidence: contradicted.flatMap(evidenceOf),
      prepare: untested.length ? "Test the remaining contradicted claims in your running app (Studio, step 5)." : undefined,
    });

  // Differentiation: code can't answer it, but it can say what you're allowed to claim.
  const verified = audit.filter((i) => i.label === "verified");
  qs.push({
    id: "diff", category: "differentiation", question: "What makes this different from what already exists?", status: verified.length ? "partial" : "unanswered",
    answer: (verified.length ? `Claims you can back with code: ${verified.map((i) => `“${i.text}”`).join("; ")}. ` : "") + "How this compares with other products isn't something the code shows.",
    evidence: verified.flatMap((i) => evidenceOf(i.verdict)),
    prepare: "Prepare your own comparison, and don't present anything as a feature that the verified claims don't support.",
  });

  // Limitations: contradicted and unproven claims, plus your own hedges.
  const limits = audit.filter((i) => i.label === "contradicted" || i.label === "risk" || i.label === "unknown");
  const hedges = project.studio.unexplained;
  qs.push({
    id: "limits", category: "limitations", question: "What doesn't work yet, or what are you unsure about?",
    status: limits.length || hedges.length ? "answered" : project.studio.verdicts.length ? "partial" : "unanswered",
    answer: limits.length || hedges.length
      ? [
        limits.length ? `From the code: ${limits.map((i) => `“${i.text}” (${i.label === "contradicted" ? "contradicted" : "not shown by the code"})`).join("; ")}.` : "",
        hedges.length ? `Where your own explanation was unsure: ${hedges.map((h) => `“${h.phrase}”`).join(", ")}.` : "",
      ].filter(Boolean).join(" ")
      : project.studio.verdicts.length ? "No checked claim is contradicted or unproven. That covers only the claims that were checked." : "Nothing has been checked yet.",
    evidence: limits.flatMap((i) => evidenceOf(i.verdict)),
    prepare: limits.length || hedges.length ? undefined : "Check more claims in Studio to find out.",
  });

  return qs;
}
