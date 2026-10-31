import { describe, expect, it } from "vitest";
import { SAMPLE_CHECK_RESPONSE, SAMPLE_CONTEXT, SAMPLE_EXTRACT_RESPONSE, SAMPLE_FILES } from "../shared/sample";
import type { ClaimCategory, ConfirmedClaim, SourceFile } from "../shared/types";
import { applyVerdictRules, reverifyVerdicts } from "../shared/verdictRules";
import { auditClaims } from "../src/hackathon/analysis/audit";
import { judgeQuestions, JUDGE_CATEGORY } from "../src/hackathon/analysis/judge";
import { readiness } from "../src/hackathon/analysis/readiness";
import { projectReport } from "../src/hackathon/analysis/report";
import { inspectStack, type EvidenceRef } from "../src/hackathon/analysis/stack";
import { filesDigest } from "../src/project/digest";
import { createProject, projectReducer, type ProjectAction } from "../src/project/reducer";
import type { Project } from "../src/project/types";
import type { DraftClaim } from "../src/steps/ClaimsStep";

const run = (p: Project, ...actions: ProjectAction[]) => actions.reduce(projectReducer, p);
const claims: DraftClaim[] = SAMPLE_EXTRACT_RESPONSE.claims.map((c, i) => ({
  id: `c${i + 1}`, text: c.text, sourceSpan: c.sourceSpan, category: c.category as ClaimCategory, traceable: true, manual: false, status: "confirmed",
}));
const confirmed: ConfirmedClaim[] = claims.map((c) => ({ id: c.id, text: c.text, category: c.category }));
const verdicts = reverifyVerdicts(applyVerdictRules(confirmed, SAMPLE_CHECK_RESPONSE.verdicts as never, SAMPLE_FILES), SAMPLE_FILES);

/** The sample project through Studio's Evidence step, as the app dispatches it. */
function sampleChecked(): Project {
  return run(
    createProject("p1"),
    { type: "setFiles", files: SAMPLE_FILES, usingSample: true },
    { type: "setContext", context: SAMPLE_CONTEXT },
    { type: "go", step: 2 },
    { type: "setExplanation", explanation: "When I type a note and press save, it goes into the notes table." },
    { type: "setExtraction", claims, unexplained: [{ phrase: "I think the login handles that", question: "What stops another user?" }] },
    { type: "resetFrom", step: 4 },
    { type: "go", step: 3 },
    { type: "setCheckResult", checkedClaims: confirmed, verdicts, filesDigest: filesDigest(SAMPLE_FILES) },
    { type: "go", step: 4 },
  );
}

/** Every evidence line must be cut from an uploaded file, at the line it names. */
function expectGrounded(evidence: EvidenceRef[], files: SourceFile[]) {
  for (const e of evidence) {
    const file = files.find((f) => f.name === e.file);
    expect(file, `evidence names a file that was not uploaded: ${e.file}`).toBeDefined();
    if (e.line && e.text) {
      const line = file!.content.replace(/\r\n?/g, "\n").split("\n")[e.line - 1]!;
      expect(line.trim().startsWith(e.text) || line.includes(e.text)).toBe(true);
    }
  }
}

describe("mode switching", () => {
  it("starts in Studio on the readiness section", () => {
    expect(createProject("p1").view).toEqual({ mode: "studio", section: "readiness" });
  });

  it("switching back and forth many times keeps every file, result and finding", () => {
    const start = run(sampleChecked(), { type: "go", step: 5 }, { type: "setFinding", claimId: "c2", finding: { status: "confirmed", observation: "B saw A's note" } });
    let p = start;
    for (let i = 0; i < 25; i++) {
      p = run(p, { type: "setView", view: { mode: "hackathon" } }, { type: "setView", view: { section: (["readiness", "stack", "audit", "judge", "report"] as const)[i % 5] } }, { type: "setView", view: { mode: "studio" } });
    }
    expect(p.files).toBe(start.files);
    expect(p.context).toBe(start.context);
    expect(p.filesDigest).toBe(start.filesDigest);
    expect(p.studio).toBe(start.studio);
    // The last section opened (iteration 24 → "report") is remembered for the next visit.
    expect(p.view).toEqual({ mode: "studio", section: "report" });
  });

  it("returning to Studio restores the step and progress exactly", () => {
    const start = run(sampleChecked(), { type: "go", step: 3 });
    const back = run(start, { type: "setView", view: { mode: "hackathon", section: "judge" } }, { type: "setView", view: { mode: "studio" } });
    expect(back.studio).toBe(start.studio);
    expect(back.studio).toMatchObject({ step: 3, reached: 4 });
    expect(back.view.section).toBe("judge");
  });

  it("file changes and restarts never change the mode", () => {
    let p = run(sampleChecked(), { type: "setView", view: { mode: "hackathon", section: "stack" } });
    p = run(p, { type: "setFiles", files: [SAMPLE_FILES[0]!], usingSample: false });
    expect(p.view).toEqual({ mode: "hackathon", section: "stack" });
    p = run(p, { type: "restart" });
    expect(p.view).toEqual({ mode: "hackathon", section: "stack" });
  });
});

describe("Tech Stack Inspector", () => {
  const report = inspectStack(SAMPLE_FILES, SAMPLE_CONTEXT);
  const named = (n: string) => report.items.find((i) => i.name === n);

  it("detects languages, frameworks and integrations from the sample, with file and line", () => {
    expect(named("TypeScript")?.evidence.map((e) => e.file)).toEqual(["src/lib/notes.ts"]);
    expect(named("TypeScript (JSX)")?.basis).toBe("detected");
    expect(named("SQL")?.basis).toBe("detected");
    expect(named("React")?.evidence[0]).toMatchObject({ file: "src/components/NoteEditor.tsx", line: 1 });
    // One line per match: line 11 is `supabase.from(...)`; the SQL migration references Supabase's auth schema.
    expect(named("Supabase")?.evidence.map((e) => `${e.file}:${e.line}`)).toEqual(["src/lib/notes.ts:11", "supabase/migrations/001_notes.sql:3", "supabase/migrations/001_notes.sql:18"]);
    expect(named("Postgres row-level security")?.basis).toBe("detected");
    for (const i of report.items) expectGrounded(i.evidence, SAMPLE_FILES);
  });

  it("marks what is only named in the setup text as an assumption, with no evidence", () => {
    const auth = report.items.find((i) => i.name.startsWith("Authentication"));
    expect(auth).toMatchObject({ basis: "assumption", evidence: [] });
    // Supabase is in the setup text too, but it was detected, so it is not an assumption.
    expect(report.items.filter((i) => i.name === "Supabase").map((i) => i.basis)).toEqual(["detected"]);
  });

  it("reads package.json dependencies and environment variable names, never values", () => {
    const files: SourceFile[] = [
      { name: "package.json", content: '{\n  "dependencies": {\n    "next": "15.0.0",\n    "stripe": "17.0.0",\n    "left-pad": "1.0.0"\n  }\n}\n' },
      { name: "api/pay.ts", content: 'import Stripe from "stripe";\nconst key = process.env.STRIPE_SECRET_KEY;\nimport { x } from "./local";\n' },
    ];
    const r = inspectStack(files, "");
    expect(r.items.find((i) => i.name === "Next.js")?.evidence[0]).toMatchObject({ file: "package.json", line: 3 });
    expect(r.items.find((i) => i.name === "Stripe")?.evidence.map((e) => e.file)).toEqual(["package.json", "api/pay.ts"]);
    expect(r.items.find((i) => i.name === "left-pad")?.kind).toBe("library");
    const env = r.items.find((i) => i.name === "Environment variables")!;
    expect(env.how).toContain("STRIPE_SECRET_KEY");
    expect(r.items.some((i) => i.name === "./local")).toBe(false);
    for (const i of r.items) expectGrounded(i.evidence, files);
  });

  it("reads Python imports", () => {
    const r = inspectStack([{ name: "app.py", content: "from flask import Flask\nimport requests\n" }], "");
    expect(r.items.map((i) => i.name)).toEqual(expect.arrayContaining(["Python", "Flask", "Requests"]));
  });

  it("claims nothing about files that were not uploaded", () => {
    const r = inspectStack([], "Next.js on Vercel with Stripe");
    expect(r.items.every((i) => i.basis === "assumption" && i.evidence.length === 0)).toBe(true);
    expect(r.items.map((i) => i.name)).toEqual(expect.arrayContaining(["Next.js", "Vercel", "Stripe"]));
  });
});

describe("Claim Audit", () => {
  it("labels the sample from the existing verdicts", () => {
    const a = auditClaims(sampleChecked());
    expect(a.items.map((i) => `${i.claimId}:${i.label}`)).toEqual(["c1:verified", "c2:contradicted", "c3:contradicted", "c4:risk"]);
    expect(a.counts).toEqual({ verified: 1, contradicted: 2, risk: 1, assumption: 0, unknown: 0 });
    expect(a.current).toBe(true);
  });

  it("shows only evidence the verification engine verified", () => {
    const p = sampleChecked();
    for (const i of auditClaims(p).items) {
      for (const q of i.verdict?.evidence ?? []) {
        const f = p.files.find((x) => x.name === q.location?.file)!;
        expect(f.content.replace(/\r\n?/g, "\n")).toContain(q.sourceText);
      }
    }
  });

  it("labels kept-but-unchecked claims as assumptions and behaviour claims without evidence as unknown", () => {
    const p = run(sampleChecked(), { type: "updateClaims", update: (cs) => [...cs, { id: "c9", text: "Notes sync across devices", sourceSpan: "", category: "behavior", traceable: true, manual: true, status: "confirmed" }, { id: "c10", text: "Deleted one", sourceSpan: "", category: "data", traceable: true, manual: true, status: "deleted" }] });
    const items = auditClaims(p).items;
    expect(items.find((i) => i.claimId === "c9")?.label).toBe("assumption");
    expect(items.some((i) => i.claimId === "c10")).toBe(false);

    const unchecked = { ...verdicts[3]!, claimId: "c5" };
    const q = run(createProject("p2"), { type: "setFiles", files: SAMPLE_FILES, usingSample: true },
      { type: "setCheckResult", checkedClaims: [{ id: "c5", text: "The page loads fast", category: "behavior" }], verdicts: [unchecked], filesDigest: filesDigest(SAMPLE_FILES) });
    expect(auditClaims(q).items[0]?.label).toBe("unknown");
  });

  it("has nothing to audit on an empty project", () => {
    expect(auditClaims(createProject("p1")).items).toEqual([]);
  });
});

describe("Readiness Dashboard", () => {
  it("shows every step as to-do on a new project", () => {
    const r = readiness(createProject("p1"), false);
    expect(r.completeness.every((c) => c.status === "todo")).toBe(true);
    expect(r.missingDocs.every((d) => !d.present)).toBe(true);
  });

  it("reflects the checked sample: complete up to testing, docs missing, demo flagged", () => {
    const r = readiness(sampleChecked(), false);
    expect(Object.fromEntries(r.completeness.map((c) => [c.id, c.status]))).toEqual({ files: "done", context: "done", explanation: "done", claims: "done", check: "done", tested: "todo" });
    expect(r.missingDocs.map((d) => d.present)).toEqual([false, false, false]);
    expect(r.unverified.map((i) => i.claimId)).toEqual(["c4"]);
    expect(r.evidenceGaps.map((g) => g.claimId)).toEqual(expect.arrayContaining(["c2", "c4"]));
    expect(r.demo.find((c) => c.id === "live")?.status).toBe("warn");
    expect(r.demo.find((c) => c.id === "high")?.status).toBe("warn");
  });

  it("marks contradictions tested once every one is ruled on", () => {
    const p = run(sampleChecked(), { type: "setFinding", claimId: "c2", finding: { status: "confirmed", observation: "" } }, { type: "setFinding", claimId: "c3", finding: { status: "false_alarm", observation: "" } });
    expect(readiness(p, true).completeness.find((c) => c.id === "tested")?.status).toBe("done");
  });
});

describe("Judge Q&A Simulator", () => {
  const p = sampleChecked();
  const qs = judgeQuestions(p, inspectStack(p.files, p.context));

  it("covers all eight question categories", () => {
    expect(new Set(qs.map((q) => q.category))).toEqual(new Set(Object.keys(JUDGE_CATEGORY)));
  });

  it("only ever cites lines from uploaded files", () => {
    for (const q of qs) expectGrounded(q.evidence, p.files);
  });

  it("answers from verified evidence and marks the rest", () => {
    const access = qs.find((q) => q.id === "sec-access")!;
    expect(access.status).toBe("answered");
    expect(access.answer).toContain("Contradicted by the code");
    expect(qs.find((q) => q.id === "sec-secrets")!.status).toBe("unanswered");
    expect(qs.find((q) => q.id === "scale-cost")!.status).toBe("unanswered");
    expect(qs.find((q) => q.id === "diff")!.status).not.toBe("answered");
    expect(qs.find((q) => q.id === "feasible")!.status).toBe("unanswered");
  });

  it("with nothing loaded, answers nothing", () => {
    const empty = judgeQuestions(createProject("p1"), inspectStack([], ""));
    expect(empty.every((q) => q.status === "unanswered")).toBe(true);
    expect(empty.flatMap((q) => q.evidence)).toEqual([]);
  });
});

describe("Project Report", () => {
  const now = new Date("2026-10-31T12:00:00Z");

  it("labels demo results and includes every section", () => {
    const md = projectReport(sampleChecked(), { live: false }, now);
    expect(md).toContain("**Demo mode.** These results come from Velora's built-in sample responses");
    for (const h of ["## Project overview", "## Detected stack", "## Audited claims", "## Readiness", "## Judge questions", "## Limitations"]) expect(md).toContain(h);
    expect(md).toContain("Generated 2026-10-31 12:00 UTC");
    expect(md).toContain("not a review of the whole repository");
    expect(md).toContain("12 files, 150 KB each, 250 KB in total");
  });

  it("names only uploaded files as evidence", () => {
    const md = projectReport(sampleChecked(), { live: true, provider: "Google Gemini", model: "m" }, now);
    expect(md).not.toContain("Demo mode.");
    for (const ref of md.matchAll(/([\w./-]+\.(?:ts|tsx|sql)):\d+/g)) expect(SAMPLE_FILES.map((f) => f.name)).toContain(ref[1]);
  });
});
