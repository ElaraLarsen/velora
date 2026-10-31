// Project Report: everything above as Markdown, labelled by what backs each line.

import { LIMITS } from "../../../shared/sourceFiles";
import type { Project } from "../../project/types";
import { AUDIT_LABEL, auditClaims } from "./audit";
import { guardian } from "./guardian";
import { JUDGE_CATEGORY, judgeQuestions } from "./judge";
import { STATUS_LABEL, byMilestone, formatDuration, formatUtc, progress } from "./planner";
import { evaluateRubric } from "./rubric";
import { readiness } from "./readiness";
import { inspectStack } from "./stack";

export interface ReportMode {
  live: boolean;
  provider?: string;
  model?: string;
}

const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
const mark = { done: "✓", todo: "○", warn: "!" } as const;

export function projectReport(project: Project, mode: ReportMode, now: Date): string {
  const stack = inspectStack(project.files, project.context);
  const audit = auditClaims(project);
  const ready = readiness(project, mode.live);
  const questions = judgeQuestions(project, stack);
  const demoSample = !mode.live;
  const out: string[] = [];

  out.push("# Velora project report", "");
  if (demoSample) {
    out.push(
      project.usingSample
        ? "> **Demo mode.** These results come from Velora's built-in sample responses for its sample project. They are not an AI analysis and not real findings."
        : "> **Demo mode.** No AI analysis was run, so no claim was checked against this code. Labels below reflect that.",
      "",
    );
  }
  out.push(
    `Generated ${now.toISOString().slice(0, 16).replace("T", " ")} UTC · ${mode.live ? `Live analysis (${mode.provider ?? "AI provider"}${mode.model ? `, ${mode.model}` : ""})` : "Demo mode"} · Static reading of ${project.files.length} uploaded file${project.files.length === 1 ? "" : "s"} only.`,
    "",
  );

  out.push("## Project overview", "");
  out.push(project.files.length ? `Files analysed (${project.files.length}):` : "No files loaded.");
  for (const f of project.files) out.push(`- \`${f.name}\``);
  out.push("", `Setup, in your words: ${project.context.trim() ? `“${project.context.trim()}”` : "not given"}.`, "");

  out.push("## Detected stack", "");
  if (!stack.items.length) out.push("Nothing detected.", "");
  else {
    out.push("| Technology | Kind | Basis | Evidence |", "|---|---|---|---|");
    for (const i of stack.items) {
      const ev = i.evidence.length ? [...new Set(i.evidence.map((e) => (e.line ? `${e.file}:${e.line}` : e.file)))].slice(0, 4).join(", ") : "none";
      out.push(`| ${cell(i.name)} | ${i.kind} | ${i.basis === "detected" ? "Detected" : "Assumption (setup text only)"} | ${cell(ev)} |`);
    }
    out.push("");
  }

  out.push("## Audited claims", "");
  if (!audit.items.length) out.push("No claims yet.", "");
  else {
    out.push("| Claim | Label | Basis |", "|---|---|---|");
    for (const i of audit.items) out.push(`| ${cell(i.text)} | ${AUDIT_LABEL[i.label].text} | ${cell(i.reason)} |`);
    out.push("", Object.entries(audit.counts).map(([k, n]) => `${AUDIT_LABEL[k as keyof typeof AUDIT_LABEL].text}: ${n}`).join(" · "), "");
    const manual = audit.items.filter((i) => i.label === "contradicted" && i.verdict?.manualTest.steps.length);
    if (manual.length) {
      out.push("### Manual tests required", "");
      for (const i of manual) {
        const f = project.studio.findings[i.claimId];
        out.push(`- **${cell(i.text)}** (${f && f.status !== "untested" ? (f.status === "confirmed" ? "confirmed in your testing" : "ruled a false alarm") : "not tested yet"})`);
        i.verdict!.manualTest.steps.forEach((s, n) => out.push(`  ${n + 1}. ${s}`));
        if (i.verdict!.manualTest.expected) out.push(`  - Expected if the claim is right: ${i.verdict!.manualTest.expected}`);
      }
      out.push("");
    }
  }

  out.push("## Readiness", "");
  for (const c of ready.completeness) out.push(`- ${mark[c.status]} ${c.label}: ${c.detail}`);
  out.push("", "Documentation among the uploaded files:");
  for (const d of ready.missingDocs) out.push(`- ${d.present ? "✓" : "○"} ${d.label}${d.present ? ` (${d.files.join(", ")})` : ": not uploaded (it may exist in your repository)"}`);
  out.push("", "Demo checklist:");
  for (const c of ready.demo) out.push(`- ${mark[c.status]} ${c.label}: ${c.detail}`);
  if (ready.evidenceGaps.length) {
    out.push("", "Evidence gaps:");
    for (const g of ready.evidenceGaps) out.push(`- “${g.text}”: ${g.rejectedQuotes} quote${g.rejectedQuotes === 1 ? "" : "s"} rejected${g.downgraded ? "; downgraded to not verifiable" : ""}`);
  }
  out.push("");

  out.push("## Judge questions", "");
  for (const q of questions) {
    out.push(`- **${JUDGE_CATEGORY[q.category]}: ${q.question}** (${q.status === "answered" ? "answered from evidence" : q.status === "partial" ? "partly answered" : "unanswered"})`);
    out.push(`  ${q.answer}`);
    if (q.prepare) out.push(`  To prepare: ${q.prepare}`);
  }
  out.push("");

  planSection(project, now, out);

  out.push("## Limitations", "");
  out.push(
    "- Static reading of the uploaded files only. Nothing here shows how the app behaves at runtime; contradicted claims need testing in the running app.",
    `- Only the files you uploaded were read (at most ${LIMITS.maxFiles} files, ${LIMITS.maxFileBytes / 1000} KB each, ${LIMITS.maxTotalBytes / 1000} KB in total). This is not a review of the whole repository.`,
    "- Not a security review or certification. A claim that isn't contradicted is not proof that the code is safe.",
    "- Stack detection reads imports, package manifests and a few recognisable code patterns; technologies named only in your setup text are marked as assumptions.",
    "- Judge answers are assembled from the evidence above and your own test results; questions the evidence can't answer are marked unanswered.",
    "",
  );
  return out.join("\n");
}

/** Planner, checklist and rubric: everything in it was entered by the user, and it says so. */
function planSection(project: Project, now: Date, out: string[]) {
  const plan = project.planner;
  const at = now.getTime();
  out.push("## Plan and submission", "", "_Everything in this section was entered by you; Velora has not checked it._", "");
  out.push(`Participation: ${plan.participation === "team" ? `team (${plan.members.map((m) => m.name).join(", ") || "no members added"})` : "solo"}.`);
  out.push(
    plan.submission === null
      ? "Submission deadline: not entered."
      : `Submission deadline: ${formatUtc(plan.submission)} (${plan.submission > at ? `${formatDuration(plan.submission - at)} left when this report was generated` : "passed when this report was generated"}).`,
    "",
  );
  if (plan.tasks.length) {
    const p = progress(plan.tasks);
    out.push(`### Tasks (${p.done} of ${p.total} completed)`, "");
    for (const g of byMilestone(plan)) {
      if (!g.tasks.length) continue;
      out.push(`**${cell(g.name)}**`, "");
      for (const t of g.tasks) {
        const owner = plan.participation === "team" ? plan.members.find((m) => m.id === t.owner)?.name ?? "unassigned" : null;
        out.push(`- [${t.status === "done" ? "x" : " "}] ${cell(t.title)} (${STATUS_LABEL[t.status]}${t.due !== null ? `, due ${formatUtc(t.due)}` : ""}${owner ? `, ${cell(owner)}` : ""})`);
      }
      out.push("");
    }
  }
  if (project.checklist.length) {
    const g = guardian(project.checklist, plan, at);
    out.push(`### Submission checklist (${g.done} of ${g.total} ticked)`, "");
    for (const i of project.checklist) out.push(`- [${i.done ? "x" : " "}] ${cell(i.label)}${i.note.trim() ? `: ${cell(i.note.trim())}` : ""}`);
    out.push("");
  }
  if (project.rubric.length) {
    const r = evaluateRubric(project.rubric);
    out.push("### Rubric self-assessment", "", "_Your own estimate, not an official judge score._", "");
    out.push("| Criterion | Weight | Your score | Weighted points |", "|---|---|---|---|");
    for (const c of project.rubric) out.push(`| ${cell(c.name)} | ${c.weight}% | ${c.score === null ? "not scored" : `${c.score}/10`} | ${r.points[c.id] ?? "–"} |`);
    out.push(
      "",
      r.overall !== null ? `Estimated total: ${r.overall} / 100.` : r.weightsValid ? `${r.scored} of ${project.rubric.length} criteria scored.` : `Weights total ${r.weightTotal}%, not 100%; no total shown.`,
      "",
    );
  }
}
