import type { CheckedVerdict, ConfirmedClaim, SourceFile } from "../../shared/types";
import type { DraftClaim } from "../steps/ClaimsStep";
import type { FindingState } from "../steps/ProveStep";
import { filesDigest } from "./digest";
import type { ChecklistItem, PlannerState, Project, ProjectView, RubricCriterion, Step, StudioState } from "./types";

// Every action matches one state update the Studio workflow already made, applied in the same
// order, so the workflow behaves exactly as before the store existed.
export type ProjectAction =
  /** New files: every result produced from the old files is cleared in the same update. */
  | { type: "setFiles"; files: SourceFile[]; usingSample: boolean }
  | { type: "setContext"; context: string }
  | { type: "setCard"; card: string }
  | { type: "setExplanation"; explanation: string }
  | { type: "setExtraction"; claims: DraftClaim[]; unexplained: { phrase: string; question: string }[] }
  | { type: "updateClaims"; update: (claims: DraftClaim[]) => DraftClaim[] }
  /**
   * The evidence check's result. `filesDigest` is the fingerprint of the files the check was sent,
   * captured when it started; a result for files that have since changed is ignored.
   */
  | { type: "setCheckResult"; checkedClaims: ConfirmedClaim[]; verdicts: CheckedVerdict[]; filesDigest: string }
  | { type: "setFinding"; claimId: string; finding: FindingState }
  /** Changing an input invalidates everything downstream of that step. */
  | { type: "resetFrom"; step: Step }
  | { type: "go"; step: Step }
  /** Clears the project for a new feature. The chosen question card is kept, as before. */
  | { type: "restart" }
  /** Switches mode or Hackathon section; never changes files, context or results. */
  | { type: "setView"; view: Partial<ProjectView> }
  /**
   * Planner, submission checklist and rubric. They are about the event, not the files, so file
   * changes and restarts keep them.
   */
  | { type: "updatePlanner"; update: (planner: PlannerState) => PlannerState }
  | { type: "updateChecklist"; update: (items: ChecklistItem[]) => ChecklistItem[] }
  | { type: "updateRubric"; update: (criteria: RubricCriterion[]) => RubricCriterion[] };

/** The usual deliverables. Users remove the ones their competition doesn't ask for and add their own. */
export const DEFAULT_CHECKLIST: string[] = [
  "Project repository URL",
  "README",
  "Presentation or pitch deck",
  "Demo video",
  "Working demo link",
  "Project description",
  "Team information",
  "Required technical documentation",
  "Submission form completed",
];

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createProject(id: string = newId()): Project {
  return {
    id,
    files: [],
    usingSample: false,
    context: "",
    filesDigest: filesDigest([]),
    studio: {
      step: 1,
      reached: 1,
      card: "data-access",
      explanation: "",
      claims: [],
      unexplained: [],
      checkedClaims: [],
      verdicts: [],
      verdictsDigest: null,
      findings: {},
    },
    view: { mode: "studio", section: "readiness" },
    planner: { submission: null, personal: null, start: null, participation: "solo", members: [], milestones: [], tasks: [] },
    checklist: DEFAULT_CHECKLIST.map((label, i) => ({ id: `d${i + 1}`, label, done: false, note: "" })),
    rubric: [],
  };
}

const minStep = (a: Step, b: Step): Step => (a < b ? a : b);
const maxStep = (a: Step, b: Step): Step => (a > b ? a : b);

/** Clears everything downstream of `step` and re-locks the steps after it. */
function invalidateFrom(s: StudioState, step: Step): StudioState {
  return {
    ...s,
    ...(step <= 3 ? { claims: [], unexplained: [] } : {}),
    checkedClaims: [],
    verdicts: [],
    verdictsDigest: null,
    findings: {},
    reached: minStep(s.reached, step),
  };
}

export function projectReducer(p: Project, a: ProjectAction): Project {
  const s = p.studio;
  switch (a.type) {
    case "setFiles":
      // Claims, verdicts and findings all came from the old files; the explanation and question
      // card are the user's own input and stay.
      return { ...p, files: a.files, usingSample: a.usingSample, filesDigest: filesDigest(a.files), studio: invalidateFrom(s, 2) };
    case "setContext":
      return { ...p, context: a.context };
    case "setCard":
      return { ...p, studio: { ...s, card: a.card } };
    case "setExplanation":
      return { ...p, studio: { ...s, explanation: a.explanation } };
    case "setExtraction":
      return { ...p, studio: { ...s, claims: a.claims, unexplained: a.unexplained } };
    case "updateClaims":
      return { ...p, studio: { ...s, claims: a.update(s.claims) } };
    case "setCheckResult":
      if (a.filesDigest !== p.filesDigest) return p;
      return { ...p, studio: { ...s, checkedClaims: a.checkedClaims, verdicts: a.verdicts, verdictsDigest: a.filesDigest, findings: {} } };
    case "setFinding":
      return { ...p, studio: { ...s, findings: { ...s.findings, [a.claimId]: a.finding } } };
    case "resetFrom":
      return { ...p, studio: invalidateFrom(s, a.step) };
    case "go":
      return { ...p, studio: { ...s, step: a.step, reached: maxStep(s.reached, a.step) } };
    case "restart": {
      const fresh = createProject(p.id);
      return { ...fresh, studio: { ...fresh.studio, card: s.card }, view: p.view, planner: p.planner, checklist: p.checklist, rubric: p.rubric };
    }
    case "setView":
      return { ...p, view: { ...p.view, ...a.view } };
    case "updatePlanner":
      return { ...p, planner: a.update(p.planner) };
    case "updateChecklist":
      return { ...p, checklist: a.update(p.checklist) };
    case "updateRubric":
      return { ...p, rubric: a.update(p.rubric) };
  }
}
