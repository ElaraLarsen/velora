// Velora Focus: the Pomodoro timer and its history, as pure functions of the saved data and the
// current time. The timer never counts ticks: a running session stores when it ends, and the time
// left is always `endsAt - now`, so background tabs, throttled timers and refreshes can't drift it.

import { z } from "zod";

export type FocusKind = "focus" | "short" | "long";
export type FocusMode = "studio" | "hackathon";

export const KIND_LABEL: Record<FocusKind, string> = { focus: "Pomodoro", short: "Short break", long: "Long break" };

/** Focus sessions before a long break is offered. */
export const CYCLE = 4;
export const LIMITS = { min: 1, max: 180 } as const;

const kind = z.enum(["focus", "short", "long"]);
const mode = z.enum(["studio", "hackathon"]);
const minutes = z.number().int().min(LIMITS.min).max(LIMITS.max);

const schema = z.object({
  version: z.literal(1),
  settings: z.object({ focus: minutes, short: minutes, long: minutes }),
  timer: z.object({
    kind,
    status: z.enum(["idle", "running", "paused"]),
    /** Planned length of this session (ms), fixed when it starts. */
    duration: z.number().positive(),
    /** When it first started; null while idle. */
    startedAt: z.number().nullable(),
    /** When it ends; set only while running. */
    endsAt: z.number().nullable(),
    /** Time left (ms) while idle or paused. */
    remaining: z.number().min(0),
  }),
  /** Focus sessions completed since the last long break. */
  cycle: z.number().int().min(0),
  /** Completed sessions only, oldest first. */
  sessions: z.array(z.object({ kind, mode, start: z.number(), end: z.number(), minutes: z.number().min(0) })),
  /** Local calendar days (YYYY-MM-DD) with recorded project activity, per mode. */
  activity: z.record(z.string(), z.object({ studio: z.boolean(), hackathon: z.boolean() })),
});

export type FocusData = z.infer<typeof schema>;
export type FocusSettings = FocusData["settings"];
export type TimerState = FocusData["timer"];
export type SessionRecord = FocusData["sessions"][number];
export const focusSchema: z.ZodType<FocusData> = schema;

/** Keep history bounded; about a year of heavy use. */
const MAX_SESSIONS = 2000;

export const DEFAULT_SETTINGS: FocusSettings = { focus: 25, short: 5, long: 15 };

export const durationOf = (k: FocusKind, s: FocusSettings) => s[k] * 60_000;

function idle(k: FocusKind, s: FocusSettings): TimerState {
  return { kind: k, status: "idle", duration: durationOf(k, s), startedAt: null, endsAt: null, remaining: durationOf(k, s) };
}

export function emptyFocus(): FocusData {
  return { version: 1, settings: { ...DEFAULT_SETTINGS }, timer: idle("focus", DEFAULT_SETTINGS), cycle: 0, sessions: [], activity: {} };
}

/** Milliseconds left in the current session. */
export function timeLeft(t: TimerState, now: number): number {
  return t.status === "running" && t.endsAt !== null ? Math.max(0, t.endsAt - now) : t.remaining;
}

export function start(d: FocusData, now: number): FocusData {
  if (d.timer.status !== "idle") return d;
  return { ...d, timer: { ...d.timer, status: "running", startedAt: now, endsAt: now + d.timer.remaining } };
}

export function pause(d: FocusData, now: number): FocusData {
  if (d.timer.status !== "running") return d;
  return { ...d, timer: { ...d.timer, status: "paused", endsAt: null, remaining: timeLeft(d.timer, now) } };
}

export function resume(d: FocusData, now: number): FocusData {
  if (d.timer.status !== "paused") return d;
  return { ...d, timer: { ...d.timer, status: "running", endsAt: now + d.timer.remaining } };
}

/** Abandons the current session (it is not recorded) and sets the full time again. */
export function reset(d: FocusData): FocusData {
  return { ...d, timer: idle(d.timer.kind, d.settings) };
}

/** Chooses Pomodoro, short or long break. Only while idle, so a running session is never lost by accident. */
export function select(d: FocusData, k: FocusKind): FocusData {
  if (d.timer.status !== "idle") return d;
  return { ...d, timer: idle(k, d.settings) };
}

/** Clamps and saves durations; an idle timer picks up its new length straight away. */
export function setSettings(d: FocusData, s: Partial<FocusSettings>): FocusData {
  const clamp = (v: number | undefined, prev: number) => (v === undefined || !Number.isFinite(v) ? prev : Math.min(LIMITS.max, Math.max(LIMITS.min, Math.round(v))));
  const settings = { focus: clamp(s.focus, d.settings.focus), short: clamp(s.short, d.settings.short), long: clamp(s.long, d.settings.long) };
  return { ...d, settings, timer: d.timer.status === "idle" ? idle(d.timer.kind, settings) : d.timer };
}

/** The next session after one of kind `k` completes. */
export function nextKind(k: FocusKind, cycle: number): FocusKind {
  if (k !== "focus") return "focus";
  return cycle >= CYCLE ? "long" : "short";
}

/**
 * Records a running session whose end time has passed. A session ends only by running out: pausing,
 * resetting or switching never records one. Returns the completed record, or null if none ended.
 */
export function settle(d: FocusData, now: number, m: FocusMode): { data: FocusData; completed: SessionRecord | null } {
  const t = d.timer;
  if (t.status !== "running" || t.endsAt === null || now < t.endsAt) return { data: d, completed: null };
  const record: SessionRecord = { kind: t.kind, mode: m, start: t.startedAt ?? t.endsAt - t.duration, end: t.endsAt, minutes: Math.round(t.duration / 60_000) };
  const cycle = t.kind === "focus" ? d.cycle + 1 : t.kind === "long" ? 0 : d.cycle;
  const sessions = [...d.sessions, record].slice(-MAX_SESSIONS);
  let data: FocusData = { ...d, cycle, sessions, timer: idle(nextKind(t.kind, cycle), d.settings) };
  if (t.kind === "focus") data = recordActivity(data, t.endsAt, m);
  return { data, completed: record };
}

/** Local calendar day, YYYY-MM-DD. */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Marks today as an active day in `m`. Returns the same object when nothing changes, so callers can skip a save. */
export function recordActivity(d: FocusData, now: number, m: FocusMode): FocusData {
  const key = dayKey(now);
  const day = d.activity[key] ?? { studio: false, hackathon: false };
  if (day[m]) return d;
  return { ...d, activity: { ...d.activity, [key]: { ...day, [m]: true } } };
}

function addDays(ms: number, n: number): number {
  const d = new Date(ms);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

export interface FocusStats {
  focusSessions: number;
  focusMinutes: number;
  breakSessions: number;
  todayMinutes: number;
  todaySessions: number;
  /** Consecutive days, ending today (or yesterday if nothing is done yet today), with a completed focus session. */
  streak: number;
  /** The last seven days, oldest first. */
  week: { day: string; minutes: number }[];
}

export function focusStats(d: FocusData, now: number): FocusStats {
  const focus = d.sessions.filter((s) => s.kind === "focus");
  const perDay = new Map<string, number>();
  for (const s of focus) perDay.set(dayKey(s.end), (perDay.get(dayKey(s.end)) ?? 0) + s.minutes);
  const today = dayKey(now);
  let streak = 0;
  let cursor = perDay.has(today) ? now : addDays(now, -1);
  while (perDay.has(dayKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return {
    focusSessions: focus.length,
    focusMinutes: focus.reduce((n, s) => n + s.minutes, 0),
    breakSessions: d.sessions.length - focus.length,
    todayMinutes: perDay.get(today) ?? 0,
    todaySessions: focus.filter((s) => dayKey(s.end) === today).length,
    streak,
    week: Array.from({ length: 7 }, (_, i) => {
      const day = dayKey(addDays(now, i - 6));
      return { day, minutes: perDay.get(day) ?? 0 };
    }),
  };
}

export interface ActivityStats {
  /** First recorded active day, or null. */
  first: string | null;
  /** Calendar days from the first active day to today, counting both. */
  span: number;
  /** Distinct days with recorded activity. */
  activeDays: number;
}

/** Active days in one mode (or both), optionally only from `since` (epoch ms) onwards. */
export function activityStats(d: FocusData, now: number, m?: FocusMode, since?: number | null): ActivityStats {
  const from = since != null ? dayKey(since) : null;
  const days = Object.entries(d.activity)
    .filter(([day, v]) => (m ? v[m] : v.studio || v.hackathon) && (from === null || day >= from))
    .map(([day]) => day)
    .sort();
  const first = days[0] ?? null;
  if (!first) return { first: null, span: 0, activeDays: 0 };
  const [y, mo, da] = first.split("-").map(Number) as [number, number, number];
  const t0 = new Date(y, mo - 1, da).getTime();
  const span = Math.round((new Date(dayKey(now) + "T00:00").getTime() - t0) / 86_400_000) + 1;
  return { first, span, activeDays: days.length };
}

/** "24:59" or "1:04:59". Rounds up, so a timer never shows 00:00 before it has actually finished. */
export function clock(ms: number): string {
  const t = Math.ceil(Math.max(0, ms) / 1000);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const mm = String(m).padStart(2, "0"), ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
