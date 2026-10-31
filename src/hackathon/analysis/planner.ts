// Hackathon planner logic: pure functions of the plan and the current time, so they can be tested
// without a clock. Every date comes from the user; nothing here invents or looks up a deadline.

import type { PlannerState, PlannerTask, TaskStatus } from "../../project/types";

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "Not started",
  doing: "In progress",
  done: "Completed",
};

export type Timing = "done" | "overdue" | "today" | "upcoming" | "none";

export function sameLocalDay(a: number, b: number): boolean {
  const x = new Date(a), y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

/** Overdue once its deadline has passed; "today" while it's still ahead but on today's date. */
export function taskTiming(task: PlannerTask, now: number): Timing {
  if (task.status === "done") return "done";
  if (task.due === null) return "none";
  if (task.due <= now) return "overdue";
  return sameLocalDay(task.due, now) ? "today" : "upcoming";
}

export interface Reminder {
  kind: "overdue" | "today" | "submission" | "submission-passed" | "after-submission";
  text: string;
}

/** The submission deadline counts as close inside this window. */
export const SUBMISSION_WARN_MS = 24 * 60 * 60 * 1000;

/** In-app reminders: shown only while Velora is open in this tab. Overdue first, then today. */
export function reminders(plan: PlannerState, now: number): Reminder[] {
  const out: Reminder[] = [];
  if (plan.submission !== null) {
    const left = plan.submission - now;
    if (left <= 0) out.push({ kind: "submission-passed", text: "The submission deadline you entered has passed." });
    else if (left <= SUBMISSION_WARN_MS) out.push({ kind: "submission", text: `Submission deadline in ${formatDuration(left)}.` });
  }
  const open = plan.tasks.filter((t) => t.status !== "done");
  const overdue = open.filter((t) => taskTiming(t, now) === "overdue");
  const today = open.filter((t) => taskTiming(t, now) === "today");
  if (overdue.length) out.push({ kind: "overdue", text: `${count(overdue.length, "task")} overdue: ${names(overdue)}.` });
  if (today.length) out.push({ kind: "today", text: `${count(today.length, "task")} due today: ${names(today)}.` });
  const late = open.filter((t) => t.due !== null && plan.submission !== null && t.due > plan.submission);
  if (late.length) out.push({ kind: "after-submission", text: `${count(late.length, "task")} due after the submission deadline: ${names(late)}.` });
  return out;
}

const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const names = (ts: PlannerTask[]) => ts.slice(0, 3).map((t) => `“${t.title}”`).join(", ") + (ts.length > 3 ? ` and ${ts.length - 3} more` : "");

export function progress(tasks: PlannerTask[]): { done: number; total: number; percent: number } {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}

/** Team mode: each member's tasks and completion, plus the unassigned ones. */
export function progressByOwner(plan: PlannerState): { id: string | null; name: string; done: number; total: number; percent: number }[] {
  const rows = plan.members.map((m) => ({ id: m.id as string | null, name: m.name, ...progress(plan.tasks.filter((t) => t.owner === m.id)) }));
  const known = new Set(plan.members.map((m) => m.id));
  const unassigned = plan.tasks.filter((t) => t.owner === null || !known.has(t.owner));
  if (unassigned.length) rows.push({ id: null, name: "Unassigned", ...progress(unassigned) });
  return rows;
}

const byDue = (a: PlannerTask, b: PlannerTask) => (a.due ?? Infinity) - (b.due ?? Infinity);

/** Tasks grouped by milestone in milestone order, then the ones without a milestone. Deadline order inside each. */
export function byMilestone(plan: PlannerState): { id: string | null; name: string; tasks: PlannerTask[] }[] {
  const known = new Set(plan.milestones.map((m) => m.id));
  const groups = plan.milestones.map((m) => ({ id: m.id as string | null, name: m.name, tasks: plan.tasks.filter((t) => t.milestone === m.id).sort(byDue) }));
  const rest = plan.tasks.filter((t) => t.milestone === null || !known.has(t.milestone)).sort(byDue);
  if (rest.length) groups.push({ id: null, name: plan.milestones.length ? "No milestone" : "All tasks", tasks: rest });
  return groups;
}

export interface Day {
  /** Local midnight of the day. */
  day: number;
  tasks: PlannerTask[];
  submission: number | null;
}

/** Calendar-style overview: one row per local day that has a task deadline or the submission deadline. */
export function days(plan: PlannerState): Day[] {
  const map = new Map<number, Day>();
  const get = (at: number) => {
    const d = new Date(at);
    const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if (!map.has(key)) map.set(key, { day: key, tasks: [], submission: null });
    return map.get(key)!;
  };
  for (const t of [...plan.tasks].sort(byDue)) if (t.due !== null) get(t.due).tasks.push(t);
  if (plan.submission !== null) get(plan.submission).submission = plan.submission;
  return [...map.values()].sort((a, b) => a.day - b.day);
}

/** "2d 4h", "3h 12m", "45m", "30s": the two largest units. */
export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m`;
  return `${s}s`;
}

/** Days, hours, minutes and seconds left, for the live countdown. */
export function countdownParts(ms: number): { d: number; h: number; m: number; s: number } {
  const t = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(t / 86400), h: Math.floor((t % 86400) / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 };
}

/**
 * A `datetime-local` value ("2026-10-31T23:59") is a wall-clock time with no zone. It is read in the
 * browser's own time zone, which the planner always shows next to the field. Null when empty or invalid.
 */
export function parseLocalInput(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function toLocalInput(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** "UTC+05:30" for the browser's offset at that moment. */
export function utcOffset(at: number): string {
  const off = -new Date(at).getTimezoneOffset();
  const a = Math.abs(off);
  return `UTC${off >= 0 ? "+" : "-"}${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;
}

/** The browser's time zone, e.g. "Asia/Kolkata (UTC+05:30)". */
export function zoneLabel(at: number = Date.now()): string {
  const name = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time";
  return `${name} (${utcOffset(at)})`;
}

export function formatLocal(ms: number): string {
  return new Date(ms).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function formatDay(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function formatUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

export function newId(prefix: string): string {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
