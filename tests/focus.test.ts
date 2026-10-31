import { describe, expect, it } from "vitest";
import { z } from "zod";
import { countdownParts } from "../src/hackathon/analysis/planner";
import { inspectDeploy } from "../src/deploy/detect";
import {
  activityStats,
  clock,
  dayKey,
  emptyFocus,
  focusSchema,
  focusStats,
  nextKind,
  pause,
  recordActivity,
  reset,
  resume,
  select,
  setSettings,
  settle,
  start,
  timeLeft,
  type FocusData,
} from "../src/focus/engine";
import { memoryStorage, storedRecord } from "../src/storage/local";

const MIN = 60_000;
const T0 = new Date(2026, 9, 31, 9, 0).getTime(); // local 31 Oct 2026, 09:00

/** Runs one full session of the current kind and settles it at its end. */
function complete(d: FocusData, at: number, mode: "studio" | "hackathon" = "studio") {
  const started = start(d, at);
  return settle(started, started.timer.endsAt!, mode);
}

describe("focus timer", () => {
  it("defaults to 25 / 5 / 15 minutes and starts idle on a Pomodoro", () => {
    const d = emptyFocus();
    expect(d.settings).toEqual({ focus: 25, short: 5, long: 15 });
    expect(d.timer).toMatchObject({ kind: "focus", status: "idle", remaining: 25 * MIN });
  });

  it("keeps time from the clock: time left is end minus now, however rarely it is checked", () => {
    const d = start(emptyFocus(), T0);
    expect(timeLeft(d.timer, T0 + 10 * MIN + 500)).toBe(15 * MIN - 500);
    // A throttled tab that wakes up long after the end sees zero, never a negative.
    expect(timeLeft(d.timer, T0 + 3 * 60 * MIN)).toBe(0);
  });

  it("pause freezes the time left and resume continues from it", () => {
    let d = start(emptyFocus(), T0);
    d = pause(d, T0 + 5 * MIN);
    expect(d.timer.status).toBe("paused");
    expect(timeLeft(d.timer, T0 + 60 * MIN)).toBe(20 * MIN); // paused for an hour: unchanged
    d = resume(d, T0 + 65 * MIN);
    expect(d.timer.endsAt).toBe(T0 + 85 * MIN);
    expect(settle(d, T0 + 84 * MIN, "studio").completed).toBeNull();
    expect(settle(d, T0 + 85 * MIN, "studio").completed).toMatchObject({ kind: "focus", minutes: 25, start: T0, end: T0 + 85 * MIN });
  });

  it("never records a session that was reset, paused or is still running", () => {
    let d = start(emptyFocus(), T0);
    expect(settle(d, T0 + 24 * MIN, "studio").completed).toBeNull();
    d = reset(pause(d, T0 + 10 * MIN));
    expect(d.timer).toMatchObject({ status: "idle", remaining: 25 * MIN });
    expect(settle(d, T0 + 99 * MIN, "studio").completed).toBeNull();
    expect(d.sessions).toEqual([]);
  });

  it("only switches session type while idle", () => {
    const running = start(emptyFocus(), T0);
    expect(select(running, "long")).toBe(running);
    expect(select(emptyFocus(), "short").timer).toMatchObject({ kind: "short", remaining: 5 * MIN });
  });

  it("offers a short break after each Pomodoro and a long break after four", () => {
    let d = emptyFocus();
    const kinds: string[] = [];
    let at = T0;
    for (let i = 0; i < 8; i++) {
      const r = complete(d, at);
      d = r.data;
      at = r.completed!.end + MIN;
      kinds.push(d.timer.kind);
    }
    expect(kinds).toEqual(["short", "focus", "short", "focus", "short", "focus", "long", "focus"]);
    expect(d.cycle).toBe(0);
    expect(nextKind("focus", 3)).toBe("short");
    expect(nextKind("focus", 4)).toBe("long");
  });

  it("clamps custom durations and applies them to an idle timer only", () => {
    const d = setSettings(emptyFocus(), { focus: 50, short: 0, long: 999 });
    expect(d.settings).toEqual({ focus: 50, short: 1, long: 180 });
    expect(d.timer.remaining).toBe(50 * MIN);
    const running = start(emptyFocus(), T0);
    expect(setSettings(running, { focus: 10 }).timer).toEqual(running.timer);
  });

  it("formats the clock rounding up, so it never shows 00:00 early", () => {
    expect(clock(25 * MIN)).toBe("25:00");
    expect(clock(1)).toBe("00:01");
    expect(clock(0)).toBe("00:00");
    expect(clock(61 * MIN)).toBe("1:01:00");
  });
});

describe("focus statistics", () => {
  it("counts only completed sessions and reports today, totals, breaks and the week", () => {
    let d = emptyFocus();
    let r = complete(d, T0, "hackathon"); // focus
    r = complete(r.data, r.completed!.end); // short break
    r = complete(r.data, r.completed!.end); // focus
    d = start(r.data, r.completed!.end); // running, not counted
    const s = focusStats(d, T0 + 3 * 60 * MIN);
    expect(s).toMatchObject({ focusSessions: 2, focusMinutes: 50, breakSessions: 1, todayMinutes: 50, todaySessions: 2, streak: 1 });
    expect(s.week).toHaveLength(7);
    expect(s.week[6]).toEqual({ day: dayKey(T0), minutes: 50 });
    expect(d.sessions.map((x) => x.mode)).toEqual(["hackathon", "studio", "studio"]);
  });

  it("builds a streak from consecutive days, allowing today to be still to come", () => {
    let d = emptyFocus();
    for (const offset of [-3, -2, -1]) d = complete(select(d, "focus"), T0 + offset * 24 * 60 * MIN).data;
    expect(focusStats(d, T0).streak).toBe(3);
    expect(focusStats(d, T0 + 2 * 24 * 60 * MIN).streak).toBe(0);
    expect(focusStats(emptyFocus(), T0)).toMatchObject({ focusSessions: 0, focusMinutes: 0, streak: 0 });
  });

  it("records active days per mode, once per day, and measures the span from the first", () => {
    let d = recordActivity(emptyFocus(), T0, "studio");
    expect(recordActivity(d, T0 + MIN, "studio")).toBe(d); // unchanged object: nothing to save
    d = recordActivity(d, T0 + 4 * 24 * 60 * MIN, "studio");
    d = recordActivity(d, T0 + 4 * 24 * 60 * MIN, "hackathon");
    const now = T0 + 9 * 24 * 60 * MIN;
    expect(activityStats(d, now, "studio")).toEqual({ first: dayKey(T0), span: 10, activeDays: 2 });
    expect(activityStats(d, now, "hackathon")).toMatchObject({ activeDays: 1 });
    expect(activityStats(d, now, "studio", T0 + 2 * 24 * 60 * MIN)).toMatchObject({ activeDays: 1 });
    expect(activityStats(emptyFocus(), now)).toEqual({ first: null, span: 0, activeDays: 0 });
  });

  it("a completed Pomodoro marks the day active in its mode", () => {
    const r = complete(emptyFocus(), T0, "hackathon");
    expect(r.data.activity[dayKey(T0)]).toEqual({ studio: false, hackathon: true });
  });
});

describe("browser storage", () => {
  const schema = z.object({ n: z.number() });

  it("round-trips a valid value", () => {
    const kv = memoryStorage();
    const rec = storedRecord("k", schema, () => ({ n: 0 }), kv);
    expect(rec.read()).toEqual({ n: 0 });
    expect(rec.write({ n: 3 })).toBe(true);
    expect(rec.read()).toEqual({ n: 3 });
  });

  it("moves corrupt or invalid data aside and falls back", () => {
    for (const bad of ["{not json", JSON.stringify({ n: "three" })]) {
      const kv = memoryStorage({ k: bad });
      expect(storedRecord("k", schema, () => ({ n: 0 }), kv).read()).toEqual({ n: 0 });
      expect(kv.get("k.unreadable")).toBe(bad);
      expect(kv.get("k")).toBeNull();
    }
  });

  it("works without storage, and survives storage that throws", () => {
    const none = storedRecord("k", schema, () => ({ n: 1 }), null);
    expect(none.persistent).toBe(false);
    expect(none.read()).toEqual({ n: 1 });
    expect(none.write({ n: 2 })).toBe(false);
    const broken = { get: () => { throw new Error("blocked"); }, set: () => { throw new Error("full"); }, remove: () => {} };
    const rec = storedRecord("k", schema, () => ({ n: 1 }), broken);
    expect(rec.read()).toEqual({ n: 1 });
    expect(rec.write({ n: 2 })).toBe(false);
  });

  it("rejects saved focus data that doesn't match the schema", () => {
    expect(focusSchema.safeParse(emptyFocus()).success).toBe(true);
    expect(focusSchema.safeParse({ ...emptyFocus(), settings: { focus: -5, short: 5, long: 15 } }).success).toBe(false);
    expect(focusSchema.safeParse({ ...emptyFocus(), version: 2 }).success).toBe(false);
  });
});

describe("deadline clock", () => {
  it("never goes negative once a deadline passes", () => {
    expect(countdownParts(-1)).toEqual({ d: 0, h: 0, m: 0, s: 0 });
    expect(countdownParts(((2 * 24 + 14) * 60 + 38) * 60_000 + 52_000)).toEqual({ d: 2, h: 14, m: 38, s: 52 });
  });
});

describe("deploy readiness", () => {
  const pkg = (deps: Record<string, string>, scripts: Record<string, string> = { build: "vite build" }) => ({
    name: "package.json",
    content: JSON.stringify({ dependencies: deps, scripts }),
  });

  it("detects a Vite app, its build, output and the variables it reads", () => {
    const r = inspectDeploy([
      pkg({ react: "19", vite: "8" }),
      { name: "src/api.ts", content: "const url = import.meta.env.VITE_API_URL; const k = process.env.STRIPE_SECRET_KEY; const m = process.env.NODE_ENV;" },
      { name: ".env.example", content: "SUPABASE_URL=\nexport SUPABASE_ANON_KEY=x\n" },
    ]);
    expect(r).toMatchObject({ kind: "frontend", framework: "Vite", build: "npm run build", output: "dist", install: "npm install" });
    expect(r.env.map((v) => v.name)).toEqual(["STRIPE_SECRET_KEY", "SUPABASE_ANON_KEY", "SUPABASE_URL", "VITE_API_URL"]);
    expect(r.env.find((v) => v.name === "VITE_API_URL")!.public).toBe(true);
    expect(r.providers).toEqual({ vercel: "supported", netlify: "supported" });
    expect(r.issues.some((i) => i.level === "blocker")).toBe(false);
  });

  it("prefers the more specific framework and reads lockfiles", () => {
    const r = inspectDeploy([pkg({ next: "15", react: "19" }), { name: "pnpm-lock.yaml", content: "" }]);
    expect(r).toMatchObject({ framework: "Next.js", kind: "fullstack", install: "pnpm install" });
  });

  it("blocks when package.json is missing or invalid, and never reads a real .env", () => {
    expect(inspectDeploy([{ name: "src/a.ts", content: "x" }]).issues[0]!.level).toBe("blocker");
    expect(inspectDeploy([{ name: "package.json", content: "{oops" }]).issues.filter((i) => i.level === "blocker")).toHaveLength(1);
    const r = inspectDeploy([pkg({ vite: "8" }), { name: ".env", content: "OPENAI_API_KEY=sk-live-should-never-appear" }]);
    expect(r.env).toEqual([]);
    expect(r.issues.find((i) => i.level === "blocker")!.text).toContain(".env");
    expect(JSON.stringify(r)).not.toContain("sk-live");
  });

  it("warns when a secret-looking name is public, and flags long-running servers", () => {
    const r = inspectDeploy([pkg({ vite: "8" }), { name: "a.ts", content: "import.meta.env.VITE_OPENAI_API_KEY" }]);
    expect(r.issues.some((i) => i.level === "warning" && i.text.includes("VITE_OPENAI_API_KEY"))).toBe(true);
    const s = inspectDeploy([pkg({ express: "5" }, { start: "node server.js" })]);
    expect(s).toMatchObject({ kind: "server", providers: { vercel: "unsupported", netlify: "unsupported" } });
  });

  it("recognises a plain static site", () => {
    expect(inspectDeploy([{ name: "index.html", content: "<h1>Hi</h1>" }, { name: "style.css", content: "" }])).toMatchObject({ kind: "static", output: ".", issues: [] });
  });
});
