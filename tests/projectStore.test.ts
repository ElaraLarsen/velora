import { describe, expect, it } from "vitest";
import { SAMPLE_CHECK_RESPONSE, SAMPLE_EXTRACT_RESPONSE, SAMPLE_FILES } from "../shared/sample";
import type { ClaimCategory, ConfirmedClaim } from "../shared/types";
import { applyVerdictRules, reverifyVerdicts } from "../shared/verdictRules";
import { filesDigest } from "../src/project/digest";
import { createProject, projectReducer, type ProjectAction } from "../src/project/reducer";
import type { Project } from "../src/project/types";
import type { DraftClaim } from "../src/steps/ClaimsStep";

const run = (p: Project, ...actions: ProjectAction[]) => actions.reduce(projectReducer, p);

// The same sequences of updates the Studio screen dispatches (src/App.tsx).
const loadSample = (p: Project) => run(p, { type: "setFiles", files: SAMPLE_FILES, usingSample: true });
const sampleClaims: DraftClaim[] = SAMPLE_EXTRACT_RESPONSE.claims.map((c, i) => ({
  id: `c${i + 1}`,
  text: c.text,
  sourceSpan: c.sourceSpan,
  category: c.category as ClaimCategory,
  traceable: true,
  manual: false,
  status: "confirmed",
}));
const extracted = (p: Project) => run(p, { type: "setExtraction", claims: sampleClaims, unexplained: [{ phrase: "I think", question: "How?" }] }, { type: "resetFrom", step: 4 }, { type: "go", step: 3 });
const confirmed: ConfirmedClaim[] = sampleClaims.map((c) => ({ id: c.id, text: c.text, category: c.category }));
const sampleVerdicts = reverifyVerdicts(applyVerdictRules(confirmed, SAMPLE_CHECK_RESPONSE.verdicts as never, SAMPLE_FILES), SAMPLE_FILES);
const checked = (p: Project) => run(p, { type: "setCheckResult", checkedClaims: confirmed, verdicts: sampleVerdicts, filesDigest: filesDigest(p.files) }, { type: "go", step: 4 });

/** Load → Explain → Claims → Evidence with the sample project, as a user would. */
function throughEvidence(): Project {
  let p = loadSample(createProject("p1"));
  p = run(p, { type: "go", step: 2 }, { type: "setExplanation", explanation: "When I type a note and press save…" });
  return checked(extracted(p));
}

describe("createProject", () => {
  it("starts empty on step 1 with the default question card", () => {
    const p = createProject("p1");
    expect(p).toMatchObject({ id: "p1", files: [], usingSample: false, context: "", filesDigest: filesDigest([]) });
    expect(p.studio).toEqual({
      step: 1, reached: 1, card: "data-access", explanation: "", claims: [], unexplained: [],
      checkedClaims: [], verdicts: [], verdictsDigest: null, findings: {},
    });
  });

  it("gives each new project its own id", () => {
    expect(createProject().id).not.toBe(createProject().id);
  });
});

describe("filesDigest", () => {
  const a = [{ name: "a.ts", content: "x" }];
  it("is stable for the same files and changes with names, contents or order", () => {
    expect(filesDigest(a)).toBe(filesDigest([{ name: "a.ts", content: "x" }]));
    expect(filesDigest(a)).not.toBe(filesDigest([{ name: "b.ts", content: "x" }]));
    expect(filesDigest(a)).not.toBe(filesDigest([{ name: "a.ts", content: "y" }]));
    const two = [{ name: "a.ts", content: "x" }, { name: "b.ts", content: "y" }];
    expect(filesDigest(two)).not.toBe(filesDigest([...two].reverse()));
  });

  it("cannot be faked by moving text between a name and its content", () => {
    expect(filesDigest([{ name: "ab", content: "c" }])).not.toBe(filesDigest([{ name: "a", content: "bc" }]));
  });
});

describe("file changes", () => {
  it("stores the files, the sample flag and a new digest", () => {
    const p = loadSample(createProject("p1"));
    expect(p.files).toBe(SAMPLE_FILES);
    expect(p.usingSample).toBe(true);
    expect(p.filesDigest).toBe(filesDigest(SAMPLE_FILES));
  });

  it("on its own clears every result from the old files and re-locks later steps", () => {
    let p = run(throughEvidence(), { type: "setCard", card: "failures" }, { type: "go", step: 5 }, { type: "setFinding", claimId: "c2", finding: { status: "confirmed", observation: "x" } });
    expect(p.studio.verdicts.length).toBeGreaterThan(0);
    p = run(p, { type: "go", step: 1 }, { type: "setFiles", files: [SAMPLE_FILES[0]!], usingSample: false });
    expect(p.studio).toMatchObject({ claims: [], unexplained: [], checkedClaims: [], verdicts: [], verdictsDigest: null, findings: {}, reached: 2, step: 1 });
    // The explanation and question card are the user's own input and survive, as before.
    expect(p.studio.explanation).toContain("press save");
    expect(p.studio.card).toBe("failures");
  });

  it("gives exactly the state the old two-step update (set files, then reset from step 2) gave", () => {
    const before = run(throughEvidence(), { type: "go", step: 5 }, { type: "go", step: 1 });
    const files = [SAMPLE_FILES[1]!, SAMPLE_FILES[0]!];
    const atomic = run(before, { type: "setFiles", files, usingSample: false });
    expect(run(atomic, { type: "resetFrom", step: 2 })).toEqual(atomic);
    expect(atomic.studio).toEqual({ ...before.studio, claims: [], unexplained: [], checkedClaims: [], verdicts: [], verdictsDigest: null, findings: {}, reached: 2 });
  });

  it("does not unlock any step on a new project", () => {
    const p = loadSample(createProject("p1"));
    expect(p.studio).toMatchObject({ step: 1, reached: 1 });
  });

  it("does not touch results when only the setup context changes (existing behaviour)", () => {
    const p = run(throughEvidence(), { type: "setContext", context: "Supabase database, email login" });
    expect(p.context).toBe("Supabase database, email login");
    expect(p.studio.verdicts).toBe(sampleVerdicts);
  });
});

describe("Studio workflow updates", () => {
  it("unlocks steps as they are reached and keeps them unlocked when going back", () => {
    let p = run(createProject("p1"), { type: "go", step: 2 }, { type: "go", step: 3 });
    expect(p.studio).toMatchObject({ step: 3, reached: 3 });
    p = run(p, { type: "go", step: 1 });
    expect(p.studio).toMatchObject({ step: 1, reached: 3 });
  });

  it("extraction keeps the new claims, clears older results and lands on Claims", () => {
    const p = extracted(loadSample(createProject("p1")));
    expect(p.studio.claims).toBe(sampleClaims);
    expect(p.studio.unexplained).toEqual([{ phrase: "I think", question: "How?" }]);
    expect(p.studio).toMatchObject({ step: 3, reached: 3, verdicts: [], findings: {} });
  });

  it("editing the explanation after extraction clears the claims (reset from step 2)", () => {
    const p = run(extracted(loadSample(createProject("p1"))), { type: "setExplanation", explanation: "new" }, { type: "resetFrom", step: 2 });
    expect(p.studio).toMatchObject({ explanation: "new", claims: [], unexplained: [], reached: 2 });
  });

  it("applies claim edits through the updater the Claims step passes", () => {
    const p = run(extracted(loadSample(createProject("p1"))), { type: "updateClaims", update: (cs) => cs.map((c) => ({ ...c, status: "pending" })) });
    expect(p.studio.claims.every((c) => c.status === "pending")).toBe(true);
  });

  it("restart clears the project but keeps the chosen question card", () => {
    const p = run(throughEvidence(), { type: "setCard", card: "failures" }, { type: "restart" });
    const fresh = createProject("p1");
    expect(p).toEqual({ ...fresh, studio: { ...fresh.studio, card: "failures" } });
  });

  it("never mutates the previous project", () => {
    const before = throughEvidence();
    const snapshot = JSON.stringify(before);
    run(before, { type: "setFinding", claimId: "c2", finding: { status: "confirmed", observation: "B saw A's note" } }, { type: "resetFrom", step: 1 }, { type: "restart" });
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe("check fingerprint", () => {
  it("stamps the result with the fingerprint captured when the check started", () => {
    const p = extracted(loadSample(createProject("p1")));
    const sent = filesDigest(p.files);
    const after = run(p, { type: "setCheckResult", checkedClaims: confirmed, verdicts: sampleVerdicts, filesDigest: sent });
    expect(after.studio.verdictsDigest).toBe(sent);
    expect(after.studio.verdicts).toBe(sampleVerdicts);
  });

  it("ignores a result whose files were replaced while the check ran", () => {
    const p = extracted(loadSample(createProject("p1")));
    const sent = filesDigest(p.files);
    const changed = run(p, { type: "go", step: 1 }, { type: "setFiles", files: [SAMPLE_FILES[0]!], usingSample: false });
    const after = run(changed, { type: "setCheckResult", checkedClaims: confirmed, verdicts: sampleVerdicts, filesDigest: sent });
    expect(after).toBe(changed);
    expect(after.studio).toMatchObject({ verdicts: [], checkedClaims: [], verdictsDigest: null });
  });

  it("still applies a result when only the setup context changed during the check", () => {
    const p = extracted(loadSample(createProject("p1")));
    const sent = filesDigest(p.files);
    const after = run(p, { type: "setContext", context: "changed" }, { type: "setCheckResult", checkedClaims: confirmed, verdicts: sampleVerdicts, filesDigest: sent });
    expect(after.studio.verdicts).toBe(sampleVerdicts);
  });

  // The same steps App.check() takes: capture the fingerprint, await the request, then apply the
  // result and move to Evidence only if the project still holds the files that were sent.
  async function simulateCheck(start: Project, duringRequest: (dispatch: (a: ProjectAction) => void) => void) {
    let state = start;
    const dispatch = (a: ProjectAction) => { state = projectReducer(state, a); };
    const sent = filesDigest(state.files);
    const request = new Promise<void>((resolve) => setTimeout(resolve, 0));
    duringRequest(dispatch);
    await request;
    if (sent === state.filesDigest) {
      dispatch({ type: "setCheckResult", checkedClaims: confirmed, verdicts: sampleVerdicts, filesDigest: sent });
      dispatch({ type: "go", step: 4 });
    }
    return state;
  }

  it("a file change while the check is in flight leaves no stale verdicts and no navigation", async () => {
    const start = extracted(loadSample(createProject("p1")));
    const end = await simulateCheck(start, (dispatch) => dispatch({ type: "setFiles", files: [SAMPLE_FILES[0]!], usingSample: false }));
    expect(end.studio).toMatchObject({ verdicts: [], checkedClaims: [], verdictsDigest: null, claims: [], step: 3, reached: 2 });
  });

  it("with no file change the check applies and lands on Evidence", async () => {
    const start = extracted(loadSample(createProject("p1")));
    const end = await simulateCheck(start, () => {});
    expect(end.studio).toMatchObject({ verdicts: sampleVerdicts, verdictsDigest: start.filesDigest, step: 4, reached: 4 });
  });
});

describe("verification results", () => {
  it("are stored with the digest of the files they were checked against", () => {
    const p = throughEvidence();
    expect(p.studio.checkedClaims).toEqual(confirmed);
    expect(p.studio.verdicts).toBe(sampleVerdicts);
    expect(p.studio.verdictsDigest).toBe(p.filesDigest);
    expect(p.studio).toMatchObject({ step: 4, reached: 4 });
  });

  it("only carry quotes that are verbatim in the uploaded files", () => {
    const p = throughEvidence();
    for (const v of p.studio.verdicts) {
      for (const q of v.evidence) {
        const file = p.files.find((f) => f.name === q.location?.file);
        expect(file?.content.replace(/\r\n?/g, "\n")).toContain(q.sourceText);
      }
    }
  });

  it("survive moving between steps, and findings recorded on Prove survive too", () => {
    const finding = { status: "confirmed" as const, observation: "Account B saw account A's note." };
    let p = run(throughEvidence(), { type: "go", step: 5 }, { type: "setFinding", claimId: "c2", finding });
    p = run(p, { type: "go", step: 4 }, { type: "go", step: 3 }, { type: "go", step: 5 });
    expect(p.studio.verdicts).toBe(sampleVerdicts);
    expect(p.studio.findings).toEqual({ c2: finding });
    expect(p.studio.reached).toBe(5);
  });

  it("a new check replaces the results and clears earlier findings", () => {
    let p = run(throughEvidence(), { type: "go", step: 5 }, { type: "setFinding", claimId: "c2", finding: { status: "false_alarm", observation: "" } });
    p = checked(run(p, { type: "go", step: 3 }));
    expect(p.studio.findings).toEqual({});
    expect(p.studio.verdicts).toBe(sampleVerdicts);
  });
});
