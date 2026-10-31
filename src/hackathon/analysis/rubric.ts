// Rubric Evaluator: the user's own criteria, weights and scores. The overall number is their estimate,
// never an official judge score. Suggestions point at what in the project could back each criterion,
// using only what Velora actually has: verified claims, the checklist and the user's own plan.

import type { Project, RubricCriterion } from "../../project/types";
import { auditClaims } from "./audit";

/** A score at or below this counts as a weak area. */
export const WEAK_AT = 5;

/** A common starting point the user is asked to replace with their own hackathon's criteria. */
export const EXAMPLE_RUBRIC: { name: string; weight: number }[] = [
  { name: "Innovation", weight: 25 },
  { name: "Technical implementation", weight: 25 },
  { name: "Impact", weight: 25 },
  { name: "Presentation and demo", weight: 25 },
];

export interface RubricResult {
  weightTotal: number;
  weightsValid: boolean;
  scored: number;
  /** Weighted points per criterion (weight × score / 10), null when unscored. */
  points: Record<string, number | null>;
  /** Out of 100: complete only when every criterion is scored and weights total 100. */
  overall: number | null;
  /** Points so far out of the weight scored so far, for a partial picture. */
  partial: { points: number; of: number };
  weak: RubricCriterion[];
}

export function evaluateRubric(criteria: RubricCriterion[]): RubricResult {
  const weightTotal = criteria.reduce((s, c) => s + (Number.isFinite(c.weight) ? c.weight : 0), 0);
  const weightsValid = criteria.length > 0 && Math.abs(weightTotal - 100) < 1e-9;
  const points: Record<string, number | null> = {};
  let sum = 0, of = 0, scored = 0;
  for (const c of criteria) {
    if (c.score === null) {
      points[c.id] = null;
      continue;
    }
    const pts = (c.weight * c.score) / 10;
    points[c.id] = Math.round(pts * 10) / 10;
    sum += pts;
    of += c.weight;
    scored++;
  }
  const round = (n: number) => Math.round(n * 10) / 10;
  return {
    weightTotal: round(weightTotal),
    weightsValid,
    scored,
    points,
    overall: weightsValid && scored === criteria.length ? round(sum) : null,
    partial: { points: round(sum), of: round(of) },
    weak: criteria.filter((c) => c.score !== null && c.score <= WEAK_AT),
  };
}

const THEMES: { match: RegExp; theme: "technical" | "demo" | "impact" | "innovation" | "design" | "docs" }[] = [
  { match: /tech|implement|engineer|code|architect|complex|function|execution|quality|scal|secur/i, theme: "technical" },
  { match: /present|demo|pitch|video|communicat|story/i, theme: "demo" },
  { match: /impact|use|value|market|business|social|problem|practical/i, theme: "impact" },
  { match: /innov|creativ|original|novel|idea|unique/i, theme: "innovation" },
  { match: /design|ux|ui|usab|experience|polish|accessib/i, theme: "design" },
  { match: /doc|readme|complete/i, theme: "docs" },
];

/** What could strengthen a criterion, based only on what this project actually holds. */
export function suggestion(c: RubricCriterion, project: Project): string {
  const theme = THEMES.find((t) => t.match.test(c.name))?.theme;
  const checklist = (label: RegExp) => project.checklist.find((i) => label.test(i.label));
  const ticked = (label: RegExp) => {
    const item = checklist(label);
    return item ? (item.done ? "ticked" : "not yet ticked") : "not on your checklist";
  };
  switch (theme) {
    case "technical": {
      if (!project.studio.verdicts.length)
        return "No claims have been checked against the code yet. Run Studio's evidence check so you can point judges to verified lines instead of descriptions.";
      const { counts } = auditClaims(project);
      return `Studio verified ${counts.verified} claim${counts.verified === 1 ? "" : "s"} against your uploaded files${
        counts.contradicted ? ` and found ${counts.contradicted} contradicted; fixing or explaining those is the clearest improvement` : ""
      }. Cite the verified lines when you present this.`;
    }
    case "demo":
      return `Demo video is ${ticked(/demo video/i)} and the pitch deck is ${ticked(/deck|presentation/i)} on your checklist. Rehearse the Judge Q&A questions that are still marked to prepare.`;
    case "impact":
      return "Code can't show impact. Prepare who the users are, the problem in one sentence, and any evidence you have such as user quotes or numbers.";
    case "innovation":
      return "Code can't show originality. Be ready to name the closest existing tools and what yours does that they don't.";
    case "design":
      return `Show the working product rather than describing it; the working demo link is ${ticked(/demo link/i)} on your checklist.`;
    case "docs":
      return `README is ${ticked(/readme/i)} and technical documentation is ${ticked(/technical doc/i)} on your checklist.`;
    default:
      return "Write down what a judge would need to see for a top score on this criterion, then add it as a task in the Planner.";
  }
}
