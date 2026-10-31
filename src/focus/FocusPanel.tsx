import { Pause, Play, RotateCcw, Settings2, Timer, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { DeadlineClock } from "../deadlines/DeadlineClock";
import { formatDay } from "../hackathon/analysis/planner";
import { useProject } from "../project/store";
import type { Project } from "../project/types";
import { Button, cx } from "../ui";
import { CYCLE, KIND_LABEL, LIMITS, activityStats, clock, dayKey, focusStats, timeLeft, type FocusData, type FocusKind } from "./engine";
import { focus, useFocus } from "./focusStore";

/** Date.now(), refreshed every `ms` while `on`. Only the component that calls it re-renders. */
function useTick(on: boolean, ms: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (!on) return;
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [on, ms]);
  return now;
}

const NEXT_HINT: Record<FocusKind, string> = {
  focus: "Time to focus.",
  short: "Focus session complete. Take a short break.",
  long: `${CYCLE} focus sessions complete. A long break is ready.`,
};

/** The header's clock button. While a session runs it shows the time left; the rest of the header doesn't re-render. */
export function FocusButton({ onOpen, open }: { onOpen: () => void; open: boolean }) {
  const data = useFocus();
  const running = data.timer.status === "running";
  const now = useTick(running, 500);
  const [announce, setAnnounce] = useState("");
  const seen = useRef(focus.lastCompleted());
  useEffect(() => {
    const c = focus.lastCompleted();
    if (c && c !== seen.current) setAnnounce(`${KIND_LABEL[c.kind]} finished. ${NEXT_HINT[data.timer.kind]}`);
    seen.current = c;
  }, [data]);
  const label = running ? `Velora Focus: ${KIND_LABEL[data.timer.kind]}, ${clock(timeLeft(data.timer, now))} left` : "Velora Focus";
  return (
    <>
      <button
        onClick={onOpen}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Velora Focus"
        className={cx(
          "inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg px-2 text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink",
          data.timer.status !== "idle" && "text-ink",
        )}
      >
        <Timer aria-hidden className="size-4" />
        {data.timer.status !== "idle" && (
          <span aria-hidden="true" className="hidden font-mono text-[0.72rem] tabular-nums sm:inline">
            {clock(timeLeft(data.timer, now))}
          </span>
        )}
        {data.timer.status === "running" && <span aria-hidden="true" className="size-1.5 rounded-full bg-highlight sm:hidden" />}
      </button>
      <span role="status" className="sr-only">
        {announce}
      </span>
    </>
  );
}

function Ring({ fraction, children }: { fraction: number; children: ReactNode }) {
  const r = 46, c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[17rem]">
      <svg viewBox="0 0 100 100" aria-hidden="true" className="absolute inset-0 size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--rule)" strokeWidth="1.2" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--highlight)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - fraction)}
          className="transition-[stroke-dashoffset] duration-500 ease-linear motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

function TimerFace({ data }: { data: FocusData }) {
  const t = data.timer;
  const now = useTick(t.status === "running", 250);
  const left = timeLeft(t, now);
  const status = t.status === "running" ? "Running" : t.status === "paused" ? "Paused" : "Ready";
  return (
    <div>
      <div role="group" aria-label="Session type" className="hw-mode mx-auto mb-6 flex w-full max-w-sm rounded-full p-[3px]">
        {(["focus", "short", "long"] as const).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={t.kind === k}
            disabled={t.status !== "idle" && t.kind !== k}
            onClick={() => focus.select(k)}
            className={cx(
              "min-h-9 flex-1 rounded-full px-2 text-[0.8rem] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              t.kind === k ? "hw-mode-on" : "text-muted hover:text-ink",
            )}
          >
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>
      <Ring fraction={t.duration ? left / t.duration : 0}>
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-eyebrow">{KIND_LABEL[t.kind]}</p>
        <p className="mt-1 font-serif text-[3.6rem] font-bold leading-none tracking-[-0.02em] text-ink tabular-nums sm:text-[4.2rem]" aria-hidden="true">
          {clock(left)}
        </p>
        <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-muted">{status}</p>
      </Ring>
      <p className="sr-only" role="status">
        {KIND_LABEL[t.kind]} {status.toLowerCase()}, {Math.ceil(left / 60_000)} minutes left.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        {t.status === "idle" && (
          <Button variant="primary" onClick={focus.start} className="min-w-32">
            <Play aria-hidden className="size-4" />
            Start
          </Button>
        )}
        {t.status === "running" && (
          <Button variant="primary" onClick={focus.pause} className="min-w-32">
            <Pause aria-hidden className="size-4" />
            Pause
          </Button>
        )}
        {t.status === "paused" && (
          <Button variant="primary" onClick={focus.resume} className="min-w-32">
            <Play aria-hidden className="size-4" />
            Resume
          </Button>
        )}
        <Button onClick={focus.reset} disabled={t.status === "idle" && left === t.duration} aria-label="Reset the timer">
          <RotateCcw aria-hidden className="size-4" />
          Reset
        </Button>
      </div>
      <div className="mt-5 flex items-center justify-center gap-2" aria-label={`${Math.min(data.cycle, CYCLE)} of ${CYCLE} focus sessions before a long break`} role="img">
        {Array.from({ length: CYCLE }, (_, i) => (
          <span key={i} className={cx("size-2 rounded-full border", i < data.cycle ? "border-highlight bg-highlight" : "border-rule-strong")} />
        ))}
      </div>
      {t.status === "idle" && data.sessions.length > 0 && <p className="mt-3 text-center text-sm text-ink-2">{NEXT_HINT[t.kind]}</p>}
      {t.status !== "idle" && <p className="mt-3 text-center text-xs text-muted">Reset to switch session type. Only sessions that run to the end are counted.</p>}
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <div className="rounded-lg border border-rule bg-paper-2/60 px-3 py-2.5">
      <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 font-serif text-[1.35rem] font-bold leading-none text-ink tabular-nums">{value}</p>
      {detail && <p className="mt-1 text-[0.7rem] text-ink-2">{detail}</p>}
    </div>
  );
}

/** A YYYY-MM-DD key as "Sat, 31 Oct". Noon avoids any daylight-saving edge. */
const dayLabel = (key: string) => formatDay(new Date(key + "T12:00").getTime());

const hm = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`);

function Heading({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <h3 className="mb-3 mt-8 flex items-baseline justify-between gap-3 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-eyebrow">
      {children}
      {aside && <span className="font-normal normal-case tracking-normal text-muted">{aside}</span>}
    </h3>
  );
}

function FocusStats({ data, now }: { data: FocusData; now: number }) {
  const s = focusStats(data, now);
  const peak = Math.max(25, ...s.week.map((d) => d.minutes));
  return (
    <>
      <Heading aside="Completed sessions only">Focus</Heading>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Today" value={hm(s.todayMinutes)} detail={`${s.todaySessions} session${s.todaySessions === 1 ? "" : "s"}`} />
        <Stat label="Total focus" value={hm(s.focusMinutes)} detail={`${s.focusSessions} Pomodoro${s.focusSessions === 1 ? "" : "s"}`} />
        <Stat label="Breaks" value={s.breakSessions} />
        <Stat label="Streak" value={`${s.streak}d`} detail="Days in a row with a Pomodoro" />
      </div>
      <div className="mt-4 flex h-20 items-end gap-1.5" role="img" aria-label={`Focus minutes, last 7 days: ${s.week.map((d) => `${dayLabel(d.day)} ${d.minutes}`).join(", ")}`}>
        {s.week.map((d) => (
          <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-1 items-end">
              <div className={cx("w-full rounded-sm", d.minutes ? "bg-highlight/80" : "bg-rule")} style={{ height: `${Math.max(4, (d.minutes / peak) * 100)}%` }} />
            </div>
            <span aria-hidden="true" className="font-mono text-[0.55rem] uppercase text-muted">
              {new Date(d.day + "T12:00").toLocaleDateString(undefined, { weekday: "narrow" })}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

/** Fourteen days, marking the ones with recorded activity in this mode. */
function ActivityStrip({ data, now, mode }: { data: FocusData; now: number; mode: "studio" | "hackathon" }) {
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() + i - 13);
    const key = dayKey(d.getTime());
    return { key, on: data.activity[key]?.[mode] ?? false };
  });
  return (
    <div className="mt-3 flex gap-1" role="img" aria-label={`Active days in the last 14: ${days.filter((d) => d.on).length}`}>
      {days.map((d) => (
        <span key={d.key} title={dayLabel(d.key)} className={cx("h-3 flex-1 rounded-[3px] border", d.on ? "border-highlight bg-highlight/70" : "border-rule bg-transparent")} />
      ))}
    </div>
  );
}

function StudioIntel({ data, now, project }: { data: FocusData; now: number; project: Project }) {
  const a = activityStats(data, now, "studio");
  const studioMinutes = data.sessions.filter((s) => s.kind === "focus" && s.mode === "studio").reduce((n, s) => n + s.minutes, 0);
  const done = project.planner.milestones.filter((m) => {
    const ts = project.planner.tasks.filter((t) => t.milestone === m.id);
    return ts.length > 0 && ts.every((t) => t.status === "done");
  }).length;
  return (
    <>
      <Heading aside="In this browser">Project activity</Heading>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Started" value={a.first ? dayLabel(a.first) : "—"} detail="First active day in Studio" />
        <Stat label="Project age" value={a.first ? `${a.span}d` : "—"} detail="Calendar days since then" />
        <Stat label="Active days" value={a.activeDays} detail="Days you changed the project" />
        <Stat label="Studio focus" value={hm(studioMinutes)} />
        <Stat label="Milestones" value={project.planner.milestones.length ? `${done}/${project.planner.milestones.length}` : "—"} detail="All tasks done" />
        <Stat label="Files" value={project.files.length} detail={project.usingSample ? "Sample project" : "Loaded now"} />
      </div>
      <ActivityStrip data={data} now={now} mode="studio" />
      <p className="mt-3 text-xs leading-relaxed text-muted">
        An active day is one where you loaded files, explained, confirmed claims, checked evidence or recorded a test result, or finished a Pomodoro. Leaving Velora
        open doesn't count.
      </p>
    </>
  );
}

function HackathonIntel({ data, now, project, onPlanner }: { data: FocusData; now: number; project: Project; onPlanner: () => void }) {
  const p = project.planner;
  const a = activityStats(data, now, "hackathon", p.start);
  const since = p.start ?? 0;
  const sessions = data.sessions.filter((s) => s.kind === "focus" && s.mode === "hackathon" && s.end >= since);
  const tick = useTick(p.submission !== null || p.personal !== null, 1000);
  const done = p.milestones.filter((m) => {
    const ts = p.tasks.filter((t) => t.milestone === m.id);
    return ts.length > 0 && ts.every((t) => t.status === "done");
  }).length;
  return (
    <>
      <Heading aside={p.start ? `Since ${formatDay(p.start)}` : "No start date set"}>Competition</Heading>
      <div className="space-y-3">
        {p.submission !== null ? (
          <div className="rounded-xl border border-rule-strong bg-card px-3 py-3">
            <DeadlineClock label="Official deadline" at={p.submission} now={tick} compact />
          </div>
        ) : null}
        {p.personal !== null ? (
          <div className="rounded-xl border border-rule bg-card px-3 py-3">
            <DeadlineClock label="My deadline" at={p.personal} now={tick} compact tone="personal" />
          </div>
        ) : null}
        {(p.submission === null || p.personal === null) && (
          <p className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-2">
            {p.submission === null ? "No official deadline yet." : "No personal deadline yet."}
            <Button variant="ghost" onClick={onPlanner}>
              Set it in the Planner
            </Button>
          </p>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Active days" value={a.activeDays} detail={p.start ? "Since the start" : "In Hackathon Mode"} />
        <Stat label="Focus" value={hm(sessions.reduce((n, s) => n + s.minutes, 0))} detail={`${sessions.length} Pomodoro${sessions.length === 1 ? "" : "s"}`} />
        <Stat label="Milestones" value={p.milestones.length ? `${done}/${p.milestones.length}` : "—"} detail="All tasks done" />
      </div>
      <ActivityStrip data={data} now={now} mode="hackathon" />
    </>
  );
}

function Durations({ data }: { data: FocusData }) {
  const [v, setV] = useState({ focus: String(data.settings.focus), short: String(data.settings.short), long: String(data.settings.long) });
  const [saved, setSaved] = useState(false);
  function save(e: FormEvent) {
    e.preventDefault();
    focus.setSettings({ focus: Number(v.focus), short: Number(v.short), long: Number(v.long) });
    const s = focus.get().settings;
    setV({ focus: String(s.focus), short: String(s.short), long: String(s.long) });
    setSaved(true);
  }
  return (
    <details className="group mt-8 rounded-xl border border-rule bg-card">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-medium text-ink">
        <Settings2 aria-hidden className="size-4 text-muted" />
        Durations
        <span className="ml-auto text-xs font-normal text-muted">
          {data.settings.focus} / {data.settings.short} / {data.settings.long} min
        </span>
      </summary>
      <form onSubmit={save} className="grid grid-cols-3 gap-2 px-4 pb-4">
        {(["focus", "short", "long"] as const).map((k) => (
          <label key={k} className="text-xs text-ink-2">
            {KIND_LABEL[k]}
            <input
              type="number"
              inputMode="numeric"
              min={LIMITS.min}
              max={LIMITS.max}
              value={v[k]}
              onChange={(e) => {
                setSaved(false);
                setV({ ...v, [k]: e.target.value });
              }}
              className="mt-1 min-h-10 w-full rounded-lg border border-rule bg-paper-2 px-2 text-sm tabular-nums text-ink focus:border-ink focus:outline-none"
            />
          </label>
        ))}
        <div className="col-span-3 flex flex-wrap items-center gap-3">
          <Button type="submit">Save durations</Button>
          <span role="status" className="text-xs text-muted">
            {saved ? (data.timer.status === "idle" ? "Saved." : "Saved. The current session keeps its length; the next one uses the new one.") : `Minutes, ${LIMITS.min} to ${LIMITS.max}.`}
          </span>
        </div>
      </form>
    </details>
  );
}

function History({ data }: { data: FocusData }) {
  const recent = data.sessions.slice(-10).reverse();
  if (!recent.length) return <p className="mt-8 text-sm text-ink-2">No completed sessions yet. Statistics start with your first Pomodoro; none are estimated.</p>;
  return (
    <>
      <Heading aside={`${data.sessions.length} recorded`}>History</Heading>
      <ol className="divide-y divide-rule rounded-xl border border-rule bg-card">
        {recent.map((s) => (
          <li key={`${s.start}-${s.end}`} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
            <span className="text-ink">{KIND_LABEL[s.kind]}</span>
            <span className="text-xs text-muted">{s.mode === "hackathon" ? "Hackathon" : "Studio"}</span>
            <span className="ml-auto text-xs tabular-nums text-ink-2">
              {new Date(s.end).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })} · {s.minutes} min
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}

/** Velora Focus: Pomodoro timer, focus history and the current mode's project statistics. */
export function FocusPanel({ onClose, onPlanner }: { onClose: () => void; onPlanner: () => void }) {
  const data = useFocus();
  const { project } = useProject();
  const now = useTick(true, 60_000);
  const heading = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const hackathon = project.view.mode === "hackathon";

  useEffect(() => {
    heading.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      // Keep Tab inside the dialog while it is open.
      if (e.key !== "Tab" || !dialog.current) return;
      const items = [...dialog.current.querySelectorAll<HTMLElement>("button:not([disabled]), input, summary, [href]")].filter((el) => (el.checkVisibility ? el.checkVisibility() : el.offsetParent !== null));
      const first = items[0], last = items[items.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-30">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="focus-title"
        className="hw-focus absolute inset-y-0 right-0 flex w-full flex-col border-l border-rule-strong bg-paper shadow-2xl sm:max-w-[30rem]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-rule px-5 py-3">
          <h2 id="focus-title" ref={heading} tabIndex={-1} className="font-serif text-[1.35rem] font-bold text-ink outline-none">
            Velora Focus
          </h2>
          <button onClick={onClose} aria-label="Close Velora Focus" className="inline-flex size-10 items-center justify-center rounded-lg text-ink-2 hover:bg-paper-2 hover:text-ink">
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-10 pt-6">
          <TimerFace data={data} />
          <FocusStats data={data} now={now} />
          {hackathon ? <HackathonIntel data={data} now={now} project={project} onPlanner={onPlanner} /> : <StudioIntel data={data} now={now} project={project} />}
          <History data={data} />
          <Durations data={data} />
          <p className="mt-6 text-xs leading-relaxed text-muted">
            {focus.persistent
              ? "Focus history, settings and active days are saved in this browser only. They aren't synced to other devices or shared with team members."
              : "This browser isn't keeping site data (for example a private window), so focus history lasts only until Velora is closed."}{" "}
            The timer keeps time from the clock, so it stays right in background tabs and after a refresh.
          </p>
        </div>
      </div>
    </div>
  );
}
