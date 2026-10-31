import { describe, expect, it } from "vitest";
import { SAMPLE_FILES } from "../shared/sample";
import { guardian } from "../src/hackathon/analysis/guardian";
import {
  byMilestone,
  countdownParts,
  days,
  formatDuration,
  parseLocalInput,
  progress,
  progressByOwner,
  reminders,
  taskTiming,
  toLocalInput,
  utcOffset,
} from "../src/hackathon/analysis/planner";
import { projectReport } from "../src/hackathon/analysis/report";
import { EXAMPLE_RUBRIC, evaluateRubric, suggestion } from "../src/hackathon/analysis/rubric";
import { createProject, DEFAULT_CHECKLIST, projectReducer, type ProjectAction } from "../src/project/reducer";
import type { PlannerState, PlannerTask, Project, RubricCriterion } from "../src/project/types";
import { TOUR } from "../src/tour/Tour";

const run = (p: Project, ...actions: ProjectAction[]) => actions.reduce(projectReducer, p);
const H = 3600_000;
// A fixed local noon, so "today" tests don't depend on when they run.
const NOW = new Date(2026, 9, 31, 12, 0, 0).getTime();
const task = (id: string, over: Partial<PlannerTask> = {}): PlannerTask => ({ id, title: id, status: "todo", due: null, milestone: null, owner: null, ...over });
const plan = (over: Partial<PlannerState> = {}): PlannerState => ({ submission: null, personal: null, start: null, participation: "solo", members: [], milestones: [], tasks: [], ...over });

describe("planner state", () => {
  it("starts solo with no deadline, no tasks and the default checklist", () => {
    const p = createProject("p");
    expect(p.planner).toEqual(plan());
    expect(p.checklist.map((i) => i.label)).toEqual(DEFAULT_CHECKLIST);
    expect(p.checklist.every((i) => !i.done)).toBe(true);
    expect(p.rubric).toEqual([]);
  });

  it("survives mode switches, new files and restart; Studio is untouched by planner edits", () => {
    const start = run(createProject("p"), { type: "setFiles", files: SAMPLE_FILES, usingSample: true });
    const p = run(
      start,
      { type: "updatePlanner", update: (s) => ({ ...s, submission: NOW + 5 * H, tasks: [task("a")] }) },
      { type: "updateChecklist", update: (xs) => xs.map((x, i) => (i === 0 ? { ...x, done: true } : x)) },
      { type: "updateRubric", update: () => [{ id: "r", name: "Impact", weight: 100, score: 7 }] },
    );
    expect(p.studio).toBe(start.studio);
    expect(p.files).toBe(start.files);
    const after = run(p, { type: "setView", view: { mode: "hackathon", section: "planner" } }, { type: "setView", view: { mode: "studio" } }, { type: "setFiles", files: [], usingSample: false }, { type: "restart" });
    expect(after.planner).toBe(p.planner);
    expect(after.checklist).toBe(p.checklist);
    expect(after.rubric).toBe(p.rubric);
  });

  it("switching solo ↔ team keeps tasks, owners and members", () => {
    const p = run(createProject("p"), {
      type: "updatePlanner",
      update: (s) => ({ ...s, participation: "team", members: [{ id: "m1", name: "Asha" }], tasks: [task("a", { owner: "m1" })] }),
    });
    const back = run(p, { type: "updatePlanner", update: (s) => ({ ...s, participation: "solo" }) }, { type: "updatePlanner", update: (s) => ({ ...s, participation: "team" }) });
    expect(back.planner.tasks).toEqual(p.planner.tasks);
    expect(back.planner.members).toEqual(p.planner.members);
  });
});

describe("planner timing", () => {
  it("classifies overdue, due today, upcoming, undated and completed tasks", () => {
    expect(taskTiming(task("a", { due: NOW - 1 }), NOW)).toBe("overdue");
    expect(taskTiming(task("a", { due: NOW + 2 * H }), NOW)).toBe("today");
    expect(taskTiming(task("a", { due: NOW + 20 * H }), NOW)).toBe("upcoming");
    expect(taskTiming(task("a"), NOW)).toBe("none");
    expect(taskTiming(task("a", { due: NOW - H, status: "done" }), NOW)).toBe("done");
  });

  it("reminds about overdue, today, a close submission and tasks due after it", () => {
    const r = reminders(plan({ submission: NOW + 3 * H, tasks: [task("late", { due: NOW - H }), task("soon", { due: NOW + H }), task("after", { due: NOW + 4 * H }), task("fin", { due: NOW - H, status: "done" })] }), NOW);
    expect(r.map((x) => x.kind)).toEqual(["submission", "overdue", "today", "after-submission"]);
    expect(r[0]!.text).toBe("Submission deadline in 3h 0m.");
    expect(r.find((x) => x.kind === "overdue")!.text).toContain("“late”");
    expect(r.some((x) => x.text.includes("“fin”"))).toBe(false);
  });

  it("has no reminders without dates, and reports a passed deadline", () => {
    expect(reminders(plan({ tasks: [task("a")] }), NOW)).toEqual([]);
    expect(reminders(plan({ submission: NOW - 1 }), NOW)[0]!.kind).toBe("submission-passed");
  });

  it("counts down in days, hours, minutes and seconds", () => {
    expect(countdownParts(((2 * 24 + 3) * 60 + 4) * 60_000 + 5000)).toEqual({ d: 2, h: 3, m: 4, s: 5 });
    expect(countdownParts(-5)).toEqual({ d: 0, h: 0, m: 0, s: 0 });
    expect(formatDuration(26 * H)).toBe("1d 2h");
    expect(formatDuration(45 * 60_000)).toBe("45m");
  });

  it("reads datetime-local values as local wall-clock time and round-trips them", () => {
    const at = parseLocalInput("2026-10-31T23:59");
    expect(at).toBe(new Date(2026, 9, 31, 23, 59).getTime());
    expect(toLocalInput(at!)).toBe("2026-10-31T23:59");
    expect(parseLocalInput("")).toBeNull();
    expect(parseLocalInput("tomorrow")).toBeNull();
    expect(utcOffset(NOW)).toMatch(/^UTC[+-]\d{2}:\d{2}$/);
  });
});

describe("planner progress and views", () => {
  const p = plan({
    participation: "team",
    members: [{ id: "m1", name: "Asha" }, { id: "m2", name: "Ravi" }],
    milestones: [{ id: "ms1", name: "MVP" }, { id: "ms2", name: "Ship" }],
    tasks: [
      task("a", { status: "done", owner: "m1", milestone: "ms1", due: NOW + 30 * H }),
      task("b", { owner: "m1", milestone: "ms1", due: NOW + 2 * H }),
      task("c", { status: "done", owner: "m2", milestone: "ms2" }),
      task("d"),
    ],
    submission: NOW + 48 * H,
  });

  it("computes completion overall and per owner", () => {
    expect(progress(p.tasks)).toEqual({ done: 2, total: 4, percent: 50 });
    expect(progressByOwner(p).map((r) => [r.name, r.done, r.total])).toEqual([["Asha", 1, 2], ["Ravi", 1, 1], ["Unassigned", 0, 1]]);
    expect(progress([])).toEqual({ done: 0, total: 0, percent: 0 });
  });

  it("groups by milestone in deadline order, with unassigned tasks last", () => {
    expect(byMilestone(p).map((g) => [g.name, g.tasks.map((t) => t.id)])).toEqual([["MVP", ["b", "a"]], ["Ship", ["c"]], ["No milestone", ["d"]]]);
  });

  it("lays out a calendar of days with the submission deadline on its own day", () => {
    const list = days(p);
    expect(list.map((d) => d.tasks.map((t) => t.id))).toEqual([["b"], ["a"], []]);
    expect(list[2]!.submission).toBe(NOW + 48 * H);
  });
});

describe("submission guardian", () => {
  const items = DEFAULT_CHECKLIST.map((label, i) => ({ id: `${i}`, label, done: i < 3, note: "" }));

  it("tracks ticks, missing items and time left", () => {
    const g = guardian(items, plan({ submission: NOW + 10 * H }), NOW);
    expect([g.done, g.total, g.percent]).toEqual([3, 9, 33]);
    expect(g.missing.map((m) => m.label)[0]).toBe("Demo video");
    expect(g.left).toBe(10 * H);
    expect(g.verdict).toEqual({ tone: "warn", text: "6 of 9 deliverables still to do, with 10h 0m left." });
  });

  it("is urgent close to the deadline, settled when all ticked, and never assumes a deadline", () => {
    expect(guardian(items, plan({ submission: NOW + 2 * H }), NOW).verdict.tone).toBe("bad");
    const all = items.map((i) => ({ ...i, done: true }));
    expect(guardian(all, plan(), NOW).verdict.tone).toBe("ok");
    expect(guardian(items, plan(), NOW).left).toBeNull();
    expect(guardian([], plan(), NOW).verdict.tone).toBe("neutral");
  });
});

describe("rubric evaluator", () => {
  const c = (id: string, weight: number, score: number | null): RubricCriterion => ({ id, name: id, weight, score });

  it("computes weighted points and the total only when weights are 100 and all are scored", () => {
    const r = evaluateRubric([c("a", 40, 8), c("b", 35, 5), c("c", 25, 10)]);
    expect(r.weightsValid).toBe(true);
    expect(r.points).toEqual({ a: 32, b: 17.5, c: 25 });
    expect(r.overall).toBe(74.5);
    expect(r.weak.map((x) => x.id)).toEqual(["b"]);
  });

  it("refuses a total when weights don't add to 100 or a criterion is unscored", () => {
    const off = evaluateRubric([c("a", 50, 8), c("b", 30, 6)]);
    expect([off.weightsValid, off.weightTotal, off.overall]).toEqual([false, 80, null]);
    const partial = evaluateRubric([c("a", 50, 8), c("b", 50, null)]);
    expect(partial.overall).toBeNull();
    expect(partial.partial).toEqual({ points: 40, of: 50 });
    expect(evaluateRubric([]).weightsValid).toBe(false);
  });

  it("offers an example that adds to 100", () => {
    expect(EXAMPLE_RUBRIC.reduce((s, x) => s + x.weight, 0)).toBe(100);
  });

  it("grounds suggestions in what the project has, and never claims checks that didn't run", () => {
    const empty = createProject("p");
    expect(suggestion(c("Technical implementation", 25, 5), empty)).toMatch(/No claims have been checked/);
    expect(suggestion(c("Presentation and demo", 25, 5), empty)).toMatch(/Demo video is not yet ticked/);
    expect(suggestion(c("Innovation", 25, 5), empty)).toMatch(/Code can't show originality/);
  });
});

describe("report and tour", () => {
  it("adds the user's plan, checklist and rubric to the report, labelled as user-entered", () => {
    const p = run(
      createProject("p"),
      { type: "updatePlanner", update: (s) => ({ ...s, submission: NOW + 5 * H, tasks: [task("Record video", { status: "done" })] }) },
      { type: "updateRubric", update: () => [c("Impact", 100, 7)] },
    );
    const md = projectReport(p, { live: false }, new Date(NOW));
    expect(md).toContain("## Plan and submission");
    expect(md).toContain("Everything in this section was entered by you");
    expect(md).toContain("- [x] Record video (Completed)");
    expect(md).toContain("### Submission checklist (0 of 9 ticked)");
    expect(md).toContain("Your own estimate, not an official judge score.");
    expect(md).toContain("Estimated total: 70 / 100.");
    expect(md).toContain("5h 0m left");
  });

  it("tours both modes, all five Studio steps and every Hackathon section", () => {
    expect(TOUR.filter((s) => s.mode === "studio" && s.title.startsWith("Studio ·")).map((s) => s.step)).toEqual([1, 2, 3, 4, 5]);
    const sections = new Set(TOUR.flatMap((s) => (s.section ? [s.section] : [])));
    expect([...sections].sort()).toEqual(["audit", "guardian", "judge", "planner", "readiness", "report", "rubric", "stack"]);
  });

  function c(id: string, weight: number, score: number | null): RubricCriterion {
    return { id, name: id, weight, score };
  }
});
