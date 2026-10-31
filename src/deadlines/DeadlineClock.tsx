import { Flag, Pencil, Target, Timer } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { countdownParts, formatLocal, formatUtc, parseLocalInput, toLocalInput, zoneLabel } from "../hackathon/analysis/planner";
import { useProject } from "../project/store";
import type { PlannerState } from "../project/types";
import { Button, cx } from "../ui";

const FIELD = "min-h-10 rounded-lg border border-rule bg-paper-2 px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none";

const n = (v: number, unit: string) => `${v} ${unit}${v === 1 ? "" : "s"}`;

const UNITS = [
  ["d", "Days"],
  ["h", "Hours"],
  ["m", "Minutes"],
  ["s", "Seconds"],
] as const;

/**
 * DAYS · HOURS · MINUTES · SECONDS to `at`, or DEADLINE REACHED. Never negative. The parent passes
 * `now`, so one clock source drives every countdown on screen.
 */
export function DeadlineClock({ label, at, now, compact = false, tone = "official" }: { label: string; at: number; now: number; compact?: boolean; tone?: "official" | "personal" }) {
  const left = at - now;
  const parts = countdownParts(left);
  return (
    <div className={cx("hw-clock", tone === "personal" && "hw-clock-personal")}>
      <p className="flex items-center gap-2 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-eyebrow">
        {tone === "official" ? <Flag aria-hidden className="size-3.5" /> : <Target aria-hidden className="size-3.5" />}
        {label}
      </p>
      {left <= 0 ? (
        <p className={cx("mt-3 font-mono font-semibold uppercase tracking-[0.18em] text-bad", compact ? "text-base" : "text-xl sm:text-2xl")}>Deadline reached</p>
      ) : (
        <div
          role="timer"
          aria-label={`${label}: ${n(parts.d, "day")}, ${n(parts.h, "hour")}, ${n(parts.m, "minute")} left`}
          className={cx("mt-3 grid grid-cols-4", compact ? "gap-1.5" : "gap-2 sm:gap-3")}
        >
          {UNITS.map(([k, unit]) => (
            <div key={k} aria-hidden="true" className={cx("hw-clock-unit flex flex-col items-center rounded-lg", compact ? "px-1 py-2" : "px-1 py-3 sm:py-4")}>
              <span className={cx("font-serif font-bold leading-none tabular-nums text-ink", compact ? "text-[1.55rem]" : "text-[2rem] sm:text-[2.9rem]")}>{String(parts[k]).padStart(2, "0")}</span>
              <span className={cx("mt-1.5 font-mono uppercase tracking-[0.14em] text-muted", compact ? "text-[0.55rem]" : "text-[0.6rem] sm:text-[0.66rem]")}>{unit}</span>
            </div>
          ))}
        </div>
      )}
      <p className={cx("mt-2.5 text-ink-2", compact ? "text-xs" : "text-sm")}>
        {formatLocal(at)} your time <span className="text-muted">· {formatUtc(at)}</span>
      </p>
    </div>
  );
}

type Field = "submission" | "personal" | "start";

const COPY: Record<Field, { label: string; set: string; help: (zone: string) => ReactNode }> = {
  submission: {
    label: "Official deadline",
    set: "Set official deadline",
    help: (zone) => (
      <>
        The submission deadline from your hackathon's official rules. It's read in your browser's time zone, <span className="text-ink">{zone}</span>, so
        convert it first if the rules give another zone. Velora never guesses it.
      </>
    ),
  },
  personal: {
    label: "My deadline",
    set: "Set my deadline",
    help: () => <>Your own earlier target, for finishing with time to spare. It never changes the official deadline.</>,
  },
  start: {
    label: "Competition start",
    set: "Set start",
    help: () => <>Optional. When the hackathon starts; Velora Focus counts your active hackathon days from here.</>,
  },
};

/** Edits one of the planner's three dates. Saving or clearing one never touches the others. */
function DateEditor({ field, plan, onDone, onCancel }: { field: Field; plan: PlannerState; onDone: () => void; onCancel?: () => void }) {
  const { dispatch } = useProject();
  const [value, setValue] = useState(plan[field] === null ? "" : toLocalInput(plan[field]!));
  const [error, setError] = useState<string | null>(null);
  const id = `dl-${field}`;
  function save(e: FormEvent) {
    e.preventDefault();
    const at = parseLocalInput(value);
    if (at === null) return setError("Enter a date and a time.");
    setError(null);
    dispatch({ type: "updatePlanner", update: (p) => ({ ...p, [field]: at }) });
    onDone();
  }
  return (
    <form onSubmit={save} className="space-y-3">
      <label htmlFor={id} className="block text-sm leading-relaxed text-ink-2">
        {COPY[field].help(zoneLabel(Date.now()))}
      </label>
      <div className="flex flex-wrap gap-2">
        <input id={id} type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} className={cx(FIELD, "min-w-0 flex-1 sm:max-w-xs")} />
        <Button type="submit" variant="primary">
          {COPY[field].set}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
    </form>
  );
}

/** One deadline: its live clock with Edit and Clear, or the form to set it. */
function DeadlinePanel({ field, plan, now }: { field: "submission" | "personal"; plan: PlannerState; now: number }) {
  const { dispatch } = useProject();
  const at = plan[field];
  const [editing, setEditing] = useState(false);
  const label = COPY[field].label;
  return (
    <div className={cx("rounded-xl border bg-card px-4 py-5 sm:px-6", field === "submission" ? "border-rule-strong" : "border-rule")}>
      {at === null || editing ? (
        <>
          <p className="mb-3 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-eyebrow">{label}</p>
          <DateEditor field={field} plan={plan} onDone={() => setEditing(false)} onCancel={at === null ? undefined : () => setEditing(false)} />
        </>
      ) : (
        <>
          <DeadlineClock label={label} at={at} now={now} tone={field === "submission" ? "official" : "personal"} />
          {field === "submission" && <p className="mt-1 text-xs text-muted">Entered by you. Check it against your hackathon's rules.</p>}
          {field === "personal" && plan.submission !== null && at > plan.submission && (
            <p className="mt-1 text-xs text-highlight">This is after the official deadline, so it won't leave you any margin.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => setEditing(true)}>
              <Pencil aria-hidden className="size-4" />
              Edit
            </Button>
            <Button variant="ghost" onClick={() => dispatch({ type: "updatePlanner", update: (p) => ({ ...p, [field]: null }) })}>
              Clear
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/** Official deadline, my deadline and the optional start date, each independent of the others. */
export function Deadlines({ plan, now }: { plan: PlannerState; now: number }) {
  const { dispatch } = useProject();
  const [editingStart, setEditingStart] = useState(false);
  return (
    <div className="mb-10 space-y-3">
      <DeadlinePanel field="submission" plan={plan} now={now} />
      <DeadlinePanel field="personal" plan={plan} now={now} />
      <div className="rounded-xl border border-rule bg-card px-4 py-3 sm:px-6">
        {editingStart || plan.start === null ? (
          editingStart ? (
            <DateEditor field="start" plan={plan} onDone={() => setEditingStart(false)} onCancel={() => setEditingStart(false)} />
          ) : (
            <p className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-2">
              <span className="flex items-center gap-2">
                <Timer aria-hidden className="size-4 text-muted" />
                Competition start: not set
              </span>
              <Button variant="ghost" onClick={() => setEditingStart(true)}>
                Add start date
              </Button>
            </p>
          )
        ) : (
          <p className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-2">
            <span className="flex items-center gap-2">
              <Timer aria-hidden className="size-4 text-muted" />
              Competition start: <span className="text-ink">{formatLocal(plan.start)}</span>
            </span>
            <span className="flex gap-1">
              <Button variant="ghost" onClick={() => setEditingStart(true)}>
                Edit
              </Button>
              <Button variant="ghost" onClick={() => dispatch({ type: "updatePlanner", update: (p) => ({ ...p, start: null }) })}>
                Clear
              </Button>
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
