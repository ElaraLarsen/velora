// The project workspace: one set of uploaded files and context, and the results produced from them.
// Held in memory only (see store.tsx). Studio is the five-step workflow; later modes will add their
// own sections next to `studio`, reading the same files and verification results.

import type { CheckedVerdict, ConfirmedClaim, SourceFile } from "../../shared/types";
import type { DraftClaim } from "../steps/ClaimsStep";
import type { FindingState } from "../steps/ProveStep";

export type Step = 1 | 2 | 3 | 4 | 5;

/** Where the Studio workflow is, and everything it has produced so far. */
export interface StudioState {
  step: Step;
  /** Furthest step unlocked; earlier steps stay reachable from the navigation. */
  reached: Step;
  card: string;
  explanation: string;
  claims: DraftClaim[];
  unexplained: { phrase: string; question: string }[];
  /** The claims that were sent to the evidence check. */
  checkedClaims: ConfirmedClaim[];
  verdicts: CheckedVerdict[];
  /** `filesDigest` of the files the verdicts were checked against; null when there are none. */
  verdictsDigest: string | null;
  findings: Record<string, FindingState>;
}

export type Mode = "studio" | "hackathon";
export type HackathonSection = "readiness" | "stack" | "audit" | "judge" | "report" | "planner" | "guardian" | "rubric";

export type TaskStatus = "todo" | "doing" | "done";

export interface PlannerTask {
  id: string;
  title: string;
  status: TaskStatus;
  /** The user's own deadline for this task (epoch ms), or null when it has none. */
  due: number | null;
  /** The milestone it belongs to, or null. */
  milestone: string | null;
  /** The team member who owns it. Ignored (but kept) while the plan is solo. */
  owner: string | null;
}

export interface TeamMember {
  id: string;
  name: string;
}

export interface Milestone {
  id: string;
  name: string;
}

/** The hackathon plan. Every date in it was entered by the user; Velora never fills one in. */
export interface PlannerState {
  /** The competition's submission deadline (epoch ms), as the user entered it from the official rules. */
  submission: number | null;
  /** The user's own earlier target (epoch ms). Independent of , which it never changes. */
  personal: number | null;
  /** When the competition starts (epoch ms), if the user entered it. */
  start: number | null;
  /** Solo by default. Switching to team and back keeps every task, owner and member. */
  participation: "solo" | "team";
  /** Names only, local to this project; there are no accounts or shared editing. */
  members: TeamMember[];
  milestones: Milestone[];
  tasks: PlannerTask[];
}

/** One deliverable on the submission checklist. Users add, rename and remove items to match their rules. */
export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  /** A link or note, e.g. the repository URL. */
  note: string;
}

/** One judging criterion. Weights and scores are the user's own; none is an official judge score. */
export interface RubricCriterion {
  id: string;
  name: string;
  /** Percent of the total; all weights should add up to 100. */
  weight: number;
  /** The user's self-assessment from 0 to 10, or null when not scored yet. */
  score: number | null;
}

/** Which mode and Hackathon section are open. Switching never touches the project's data. */
export interface ProjectView {
  mode: Mode;
  section: HackathonSection;
}

export interface Project {
  id: string;
  files: SourceFile[];
  usingSample: boolean;
  context: string;
  /** Identifies the current file set, so results can tell which files they came from. */
  filesDigest: string;
  studio: StudioState;
  view: ProjectView;
  planner: PlannerState;
  checklist: ChecklistItem[];
  rubric: RubricCriterion[];
}
