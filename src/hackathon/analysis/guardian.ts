// Submission Guardian: the user's own deliverables checklist and how it stands against the deadline
// they entered. Nothing here checks a deliverable exists; ticking an item is the user's statement.

import type { ChecklistItem, PlannerState } from "../../project/types";
import { formatDuration } from "./planner";

export interface GuardianSummary {
  done: number;
  total: number;
  percent: number;
  missing: ChecklistItem[];
  /** Milliseconds to the submission deadline, or null when none is entered. */
  left: number | null;
  verdict: { tone: "ok" | "warn" | "bad" | "neutral"; text: string };
}

export function guardian(items: ChecklistItem[], plan: PlannerState, now: number): GuardianSummary {
  const done = items.filter((i) => i.done).length;
  const total = items.length;
  const missing = items.filter((i) => !i.done);
  const left = plan.submission === null ? null : plan.submission - now;
  const percent = total ? Math.round((done / total) * 100) : 0;

  let verdict: GuardianSummary["verdict"];
  if (!total) verdict = { tone: "neutral", text: "The checklist is empty. Add the deliverables your hackathon's rules ask for." };
  else if (left !== null && left <= 0)
    verdict = missing.length
      ? { tone: "bad", text: `The deadline you entered has passed with ${missing.length} of ${total} deliverables not ticked.` }
      : { tone: "ok", text: "Every deliverable on your list is ticked. The deadline you entered has passed." };
  else if (!missing.length)
    verdict = { tone: "ok", text: "Every deliverable on your list is ticked. Make sure the submission itself has gone through." };
  else
    verdict = {
      tone: left !== null && left <= 6 * 3600 * 1000 ? "bad" : "warn",
      text: `${missing.length} of ${total} deliverables still to do${left !== null ? `, with ${formatDuration(left)} left` : ""}.`,
    };
  return { done, total, percent, missing, left, verdict };
}
