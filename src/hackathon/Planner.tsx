import { Bell, CalendarDays, Check, Flag, ListTree, Pencil, Plus, Trash2, User, Users, X } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Deadlines } from "../deadlines/DeadlineClock";
import { useProject } from "../project/store";
import type { PlannerState, PlannerTask, TaskStatus } from "../project/types";
import { Button, cx } from "../ui";
import {
  STATUS_LABEL,
  byMilestone,
  days,
  formatDay,
  formatLocal,
  formatTime,
  newId,
  parseLocalInput,
  progress,
  progressByOwner,
  reminders,
  taskTiming,
  toLocalInput,
  zoneLabel,
  type Reminder,
} from "./analysis/planner";
import { Badge, SectionHeading, SectionTitle } from "./parts";

export const FIELD = "min-h-10 rounded-lg border border-rule bg-paper-2 px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none";

/** The current time, updated every `ms` milliseconds while the component is mounted. */
export function useNow(ms: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

const REMINDER_TONE: Record<Reminder["kind"], string> = {
  overdue: "text-bad",
  "submission-passed": "text-bad",
  submission: "text-highlight",
  today: "text-highlight",
  "after-submission": "text-ink-2",
};

/** In-app reminders. Renders nothing when there are none. */
export function ReminderList({ items, onOpen }: { items: Reminder[]; onOpen?: () => void }) {
  if (!items.length) return null;
  return (
    <div role="status" className="mb-6 rounded-xl border border-rule-strong bg-card px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium text-ink">
          <Bell aria-hidden className="size-4 text-highlight" />
          Planner reminders
        </p>
        {onOpen && (
          <button onClick={onOpen} className="min-h-9 text-sm text-ink-2 underline underline-offset-4 hover:text-ink">
            Open planner
          </button>
        )}
      </div>
      <ul className="mt-1.5 space-y-1">
        {items.map((r, i) => (
          <li key={i} className={cx("text-sm leading-relaxed", REMINDER_TONE[r.kind])}>
            {r.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Reminders for the other sections; it keeps its own clock so nothing else re-renders. */
export function PlannerReminders({ onOpen }: { onOpen: () => void }) {
  const { project } = useProject();
  const now = useNow(30_000);
  return <ReminderList items={reminders(project.planner, now)} onOpen={onOpen} />;
}

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string; Icon: typeof User }[]; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} className="hw-mode inline-flex rounded-full p-[3px]">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cx("inline-flex min-h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors", value === o.id ? "hw-mode-on" : "text-muted hover:text-ink")}
        >
          <o.Icon aria-hidden className="size-4" />
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Planner() {
  const { project, dispatch } = useProject();
  const plan = project.planner;
  const update = (fn: (p: PlannerState) => PlannerState) => dispatch({ type: "updatePlanner", update: fn });
  const now = useNow(1000);
  const zone = zoneLabel(now);
  const team = plan.participation === "team";

  const [view, setView] = useState<"milestones" | "calendar">("milestones");

  const overall = progress(plan.tasks);

  return (
    <section aria-labelledby="hk-planner">
      <SectionHeading
        label="Hackathon · Planner"
        title={<span id="hk-planner">Plan to the <em>deadline</em>.</span>}
        lede="Your submission deadline, the work left and who's doing it. Every date here is one you entered; Velora never guesses a competition deadline."
      />

      <ReminderList items={reminders(plan, now)} />

      <div className="mb-10 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Segmented
          label="Participation"
          value={plan.participation}
          onChange={(participation) => update((p) => ({ ...p, participation }))}
          options={[
            { id: "solo", label: "Solo", Icon: User },
            { id: "team", label: "Team", Icon: Users },
          ]}
        />
        <p className="min-w-0 flex-1 basis-60 text-sm text-ink-2">
          {team ? "Assign tasks to team members and see who owns what." : "Every task is yours. Switch to Team any time; nothing is lost either way."}
        </p>
      </div>

      {team && <TeamMembers plan={plan} update={update} />}

      <SectionTitle aside={zone}>Deadlines</SectionTitle>
      <Deadlines plan={plan} now={now} />

      <SectionTitle aside={overall.total ? `${overall.done} of ${overall.total} completed` : undefined}>{team ? "Team progress" : "Your progress"}</SectionTitle>
      {overall.total ? (
        <div className="mb-8 space-y-3">
          <ProgressBar label="All tasks" {...overall} />
          {team && progressByOwner(plan).map((r) => <ProgressBar key={r.id ?? "none"} label={r.name} {...r} small />)}
          <p className="text-xs text-muted">Completion of your own task list. It says nothing about the project's quality.</p>
        </div>
      ) : (
        <p className="mb-8 text-sm text-ink-2">Add tasks below to track progress.</p>
      )}

      <AddTask plan={plan} update={update} team={team} />
      <Milestones plan={plan} update={update} />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[0.78rem] font-bold uppercase tracking-[0.16em] text-eyebrow">Timeline</h2>
        <Segmented
          label="Timeline view"
          value={view}
          onChange={setView}
          options={[
            { id: "milestones", label: "By milestone", Icon: ListTree },
            { id: "calendar", label: "Calendar", Icon: CalendarDays },
          ]}
        />
      </div>
      {!plan.tasks.length && plan.submission === null ? (
        <p className="rounded-xl border border-dashed border-rule-strong px-4 py-6 text-sm text-ink-2">
          No tasks yet. Add the work left before submission, such as the demo video, README and final deploy, each with its own deadline.
        </p>
      ) : view === "milestones" ? (
        <div className="space-y-6">
          {byMilestone(plan).map((g) => (
            <div key={g.id ?? "none"}>
              <p className="mb-2 flex items-baseline justify-between gap-2 text-sm font-medium text-ink">
                {g.name}
                <span className="text-xs font-normal text-muted">
                  {progress(g.tasks).done} of {g.tasks.length} completed
                </span>
              </p>
              {g.tasks.length ? (
                <ol className="space-y-2">
                  {g.tasks.map((t) => (
                    <TaskRow key={t.id} task={t} now={now} plan={plan} update={update} team={team} />
                  ))}
                </ol>
              ) : (
                <p className="rounded-xl border border-dashed border-rule px-4 py-3 text-sm text-muted">No tasks in this milestone yet.</p>
              )}
            </div>
          ))}
          {plan.submission !== null && (
            <p className="flex items-center gap-2 text-sm text-ink-2">
              <Flag aria-hidden className="size-4 text-highlight" />
              Competition submission deadline: <span className="text-ink">{formatLocal(plan.submission)}</span>
            </p>
          )}
        </div>
      ) : (
        <Calendar plan={plan} now={now} team={team} update={update} />
      )}

      <p className="mt-8 text-sm leading-relaxed text-muted">
        Reminders appear inside Velora only, while it's open in this tab. Velora doesn't send system notifications, emails or alerts when the tab or
        browser is closed. {team ? "Team names live only in this project on this device; there's no shared editing. " : ""}The three dates above are
        saved in this browser so a refresh keeps them; tasks, milestones and team names are kept in memory like the rest of the project, so refreshing or
        closing Velora discards them.
      </p>
    </section>
  );
}

function ProgressBar({ label, done, total, percent, small }: { label: string; done: number; total: number; percent: number; small?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className={small ? "text-ink-2" : "text-ink"}>{label}</span>
        <span className="text-xs text-muted tabular-nums">
          {done}/{total} · {percent}%
        </span>
      </div>
      <div role="progressbar" aria-label={`${label}: tasks completed`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className={cx("overflow-hidden rounded-full bg-paper-2", small ? "h-1.5" : "h-2")}>
        <div className="h-full rounded-full bg-ok transition-[width]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

type Update = (fn: (p: PlannerState) => PlannerState) => void;

function TeamMembers({ plan, update }: { plan: PlannerState; update: Update }) {
  const [name, setName] = useState("");
  function add(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    update((p) => ({ ...p, members: [...p.members, { id: newId("m"), name: n }] }));
    setName("");
  }
  return (
    <div className="mb-10">
      <SectionTitle aside={`${plan.members.length} member${plan.members.length === 1 ? "" : "s"}`}>Team</SectionTitle>
      <div className="rounded-xl border border-rule bg-card px-4 py-4 sm:px-5">
        {plan.members.length > 0 && (
          <ul className="mb-3 flex flex-wrap gap-2">
            {plan.members.map((m) => (
              <li key={m.id} className="inline-flex items-center gap-1 rounded-full border border-rule-strong py-1 pl-3 pr-1 text-sm text-ink">
                {m.name}
                <button
                  aria-label={`Remove ${m.name}`}
                  onClick={() => update((p) => ({ ...p, members: p.members.filter((x) => x.id !== m.id), tasks: p.tasks.map((t) => (t.owner === m.id ? { ...t, owner: null } : t)) }))}
                  className="inline-flex size-7 items-center justify-center rounded-full text-ink-2 hover:bg-paper-2 hover:text-bad"
                >
                  <X aria-hidden className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={add} className="flex flex-wrap gap-2">
          <label htmlFor="pl-member" className="sr-only">
            Team member name
          </label>
          <input id="pl-member" value={name} onChange={(e) => setName(e.target.value)} placeholder="Team member's name" className={cx(FIELD, "min-w-0 flex-1 sm:max-w-xs")} />
          <Button type="submit" disabled={!name.trim()}>
            <Plus aria-hidden className="size-4" />
            Add member
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted">Names stay in this project on this device. There are no accounts or shared editing.</p>
      </div>
    </div>
  );
}

function AddTask({ plan, update, team }: { plan: PlannerState; update: Update; team: boolean }) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [milestone, setMilestone] = useState("");
  const [owner, setOwner] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add(e: FormEvent) {
    e.preventDefault();
    const name = title.trim();
    if (!name) return setError("Give the task a name.");
    if (due && parseLocalInput(due) === null) return setError("That deadline isn't a valid date and time.");
    setError(null);
    const task: PlannerTask = { id: newId("t"), title: name, status: "todo", due: parseLocalInput(due), milestone: milestone || null, owner: owner || null };
    update((p) => ({ ...p, tasks: [...p.tasks, task] }));
    setTitle("");
    setDue("");
  }

  return (
    <form onSubmit={add} className="mb-4 rounded-xl border border-rule bg-card px-4 py-4 sm:px-5">
      <p className="mb-3 text-sm font-medium text-ink">Add a task</p>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Task" id="pl-title" grow={2}>
          <input id="pl-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Record the demo video" className={cx(FIELD, "w-full")} />
        </Field>
        <Field label="Your deadline (optional)" id="pl-due">
          <input id="pl-due" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className={cx(FIELD, "w-full")} />
        </Field>
        {plan.milestones.length > 0 && (
          <Field label="Milestone" id="pl-ms">
            <select id="pl-ms" value={milestone} onChange={(e) => setMilestone(e.target.value)} className={cx(FIELD, "w-full")}>
              <option value="">No milestone</option>
              {plan.milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        {team && (
          <Field label="Owner" id="pl-owner">
            <select id="pl-owner" value={owner} onChange={(e) => setOwner(e.target.value)} className={cx(FIELD, "w-full")}>
              <option value="">Unassigned</option>
              {plan.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Button type="submit" variant="primary">
          <Plus aria-hidden className="size-4" />
          Add task
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-bad">
          {error}
        </p>
      )}
    </form>
  );
}

function Field({ label, id, grow = 1, children }: { label: string; id: string; grow?: 1 | 2; children: ReactNode }) {
  return (
    <div className={cx("min-w-0", grow === 2 ? "flex-[2_1_14rem]" : "flex-[1_1_11rem]")}>
      <label htmlFor={id} className="mb-1 block text-xs text-ink-2">
        {label}
      </label>
      {children}
    </div>
  );
}

function Milestones({ plan, update }: { plan: PlannerState; update: Update }) {
  const [name, setName] = useState("");
  function add(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    update((p) => ({ ...p, milestones: [...p.milestones, { id: newId("ms"), name: n }] }));
    setName("");
  }
  return (
    <div className="mb-10 rounded-xl border border-rule bg-card px-4 py-4 sm:px-5">
      <p className="mb-1 text-sm font-medium text-ink">Milestones</p>
      <p className="mb-3 text-xs text-ink-2">Group tasks into stages such as “MVP working” or “Submission package”.</p>
      {plan.milestones.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2">
          {plan.milestones.map((m) => (
            <li key={m.id} className="inline-flex items-center gap-1 rounded-full border border-rule-strong py-1 pl-3 pr-1 text-sm text-ink">
              {m.name}
              <button
                aria-label={`Remove milestone ${m.name}; its tasks are kept`}
                onClick={() => update((p) => ({ ...p, milestones: p.milestones.filter((x) => x.id !== m.id), tasks: p.tasks.map((t) => (t.milestone === m.id ? { ...t, milestone: null } : t)) }))}
                className="inline-flex size-7 items-center justify-center rounded-full text-ink-2 hover:bg-paper-2 hover:text-bad"
              >
                <X aria-hidden className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="flex flex-wrap gap-2">
        <label htmlFor="pl-milestone" className="sr-only">
          Milestone name
        </label>
        <input id="pl-milestone" value={name} onChange={(e) => setName(e.target.value)} placeholder="Milestone name" className={cx(FIELD, "min-w-0 flex-1 sm:max-w-xs")} />
        <Button type="submit" disabled={!name.trim()}>
          <Plus aria-hidden className="size-4" />
          Add milestone
        </Button>
      </form>
    </div>
  );
}

function Calendar({ plan, now, team, update }: { plan: PlannerState; now: number; team: boolean; update: Update }) {
  const list = days(plan);
  const undated = plan.tasks.filter((t) => t.due === null);
  return (
    <div className="space-y-5">
      {list.map((d) => (
        <div key={d.day}>
          <p className="mb-2 text-sm font-medium text-ink">{formatDay(d.day)}</p>
          <ol className="space-y-2">
            {[...d.tasks.map((t) => ({ at: t.due!, t })), ...(d.submission !== null ? [{ at: d.submission, t: null }] : [])]
              .sort((a, b) => a.at - b.at)
              .map(({ at, t }) =>
                t ? (
                  <TaskRow key={t.id} task={t} now={now} plan={plan} update={update} team={team} />
                ) : (
                  <li key="submission" className="flex flex-wrap items-center gap-3 rounded-xl border border-highlight/60 bg-card px-4 py-3 sm:px-5">
                    <Flag aria-hidden className="size-4 text-highlight" />
                    <span className="text-sm font-medium text-ink">Competition submission deadline</span>
                    <span className="text-sm text-ink-2">{formatTime(at)}</span>
                  </li>
                ),
              )}
          </ol>
        </div>
      ))}
      {undated.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-ink">No deadline</p>
          <ol className="space-y-2">
            {undated.map((t) => (
              <TaskRow key={t.id} task={t} now={now} plan={plan} update={update} team={team} />
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, now, plan, update, team }: { task: PlannerTask; now: number; plan: PlannerState; update: Update; team: boolean }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [due, setDue] = useState(task.due === null ? "" : toLocalInput(task.due));
  const timing = taskTiming(task, now);
  const after = task.status !== "done" && task.due !== null && plan.submission !== null && task.due > plan.submission;
  const owner = plan.members.find((m) => m.id === task.owner);
  const patch = (p: Partial<PlannerTask>) => update((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === task.id ? { ...t, ...p } : t)) }));

  if (editing) {
    return (
      <li className="rounded-xl border border-ink/40 bg-card px-4 py-3 sm:px-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            patch({ title: title.trim(), due: parseLocalInput(due) });
            setEditing(false);
          }}
          className="flex flex-wrap items-end gap-2"
        >
          <Field label="Task" id={`ed-t-${task.id}`} grow={2}>
            <input id={`ed-t-${task.id}`} value={title} onChange={(e) => setTitle(e.target.value)} className={cx(FIELD, "w-full")} />
          </Field>
          <Field label="Your deadline" id={`ed-d-${task.id}`}>
            <input id={`ed-d-${task.id}`} type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className={cx(FIELD, "w-full")} />
          </Field>
          <Button type="submit" variant="primary" disabled={!title.trim()}>
            <Check aria-hidden className="size-4" />
            Save
          </Button>
          <Button variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </form>
      </li>
    );
  }

  return (
    <li
      className={cx(
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border bg-card px-4 py-3 sm:px-5",
        timing === "overdue" ? "border-bad/70" : timing === "today" ? "border-highlight/60" : "border-rule",
      )}
    >
      <div className="min-w-0 flex-1 basis-48">
        <p className={cx("break-words text-sm", task.status === "done" ? "text-ink-2 line-through" : "text-ink")}>{task.title}</p>
        <p className="mt-0.5 text-xs text-ink-2">
          {task.due === null ? "No deadline" : `Your deadline: ${formatLocal(task.due)}`}
          {team && ` · ${owner ? owner.name : "Unassigned"}`}
        </p>
      </div>
      {timing === "overdue" && <Badge tone="text-bad">Overdue</Badge>}
      {timing === "today" && <Badge tone="text-highlight">Due today</Badge>}
      {after && <Badge tone="text-ink-2">After submission</Badge>}
      <div className="flex flex-wrap items-center gap-1.5">
        {plan.milestones.length > 0 && (
          <>
            <label htmlFor={`ms-${task.id}`} className="sr-only">
              Milestone for {task.title}
            </label>
            <select id={`ms-${task.id}`} value={task.milestone ?? ""} onChange={(e) => patch({ milestone: e.target.value || null })} className={cx(FIELD, "max-w-40 text-xs")}>
              <option value="">No milestone</option>
              {plan.milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </>
        )}
        {team && (
          <>
            <label htmlFor={`ow-${task.id}`} className="sr-only">
              Owner of {task.title}
            </label>
            <select id={`ow-${task.id}`} value={owner ? owner.id : ""} onChange={(e) => patch({ owner: e.target.value || null })} className={cx(FIELD, "max-w-36 text-xs")}>
              <option value="">Unassigned</option>
              {plan.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </>
        )}
        <label htmlFor={`st-${task.id}`} className="sr-only">
          Status of {task.title}
        </label>
        <select id={`st-${task.id}`} value={task.status} onChange={(e) => patch({ status: e.target.value as TaskStatus })} className={cx(FIELD, "text-xs")}>
          {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            setTitle(task.title);
            setDue(task.due === null ? "" : toLocalInput(task.due));
            setEditing(true);
          }}
          aria-label={`Edit ${task.title}`}
          className="inline-flex size-10 items-center justify-center rounded-lg text-ink-2 hover:bg-paper-2 hover:text-ink"
        >
          <Pencil aria-hidden className="size-4" />
        </button>
        <button
          onClick={() => update((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== task.id) }))}
          aria-label={`Delete ${task.title}`}
          className="inline-flex size-10 items-center justify-center rounded-lg text-ink-2 hover:bg-paper-2 hover:text-bad"
        >
          <Trash2 aria-hidden className="size-4" />
        </button>
      </div>
    </li>
  );
}
