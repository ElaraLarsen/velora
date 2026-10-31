// The live Focus store: the saved FocusData plus the one timeout that ends a running session.
// Components subscribe with useFocus(); only they re-render when it changes, never the whole app.
// The timeout is a wake-up, not a clock: whenever it fires late (throttled background tab) or not at
// all (page closed), settle() still records the session at its real end time.

import { useSyncExternalStore } from "react";
import { z } from "zod";
import { storedRecord } from "../storage/local";
import { playChime } from "../modes/sound";
import * as engine from "./engine";
import type { FocusData, FocusKind, FocusMode, FocusSettings, SessionRecord } from "./engine";

const saved = storedRecord("velora.focus.v1", engine.focusSchema, engine.emptyFocus);
const prefs = storedRecord("velora.prefs.v1", z.object({ sound: z.boolean() }), () => ({ sound: false }));

let data: FocusData | null = null;
let sound: boolean | null = null;
let mode: FocusMode = "studio";
let wake: ReturnType<typeof setTimeout> | null = null;
let lastCompleted: SessionRecord | null = null;
const listeners = new Set<() => void>();

function current(): FocusData {
  if (data === null) {
    data = saved.read();
    // A session that ran out while Velora was closed is recorded at its real end.
    const r = engine.settle(data, Date.now(), mode);
    if (r.completed) {
      data = r.data;
      lastCompleted = r.completed;
      saved.write(data);
    }
    schedule();
    if (typeof window !== "undefined") {
      document.addEventListener("visibilitychange", check);
      window.addEventListener("focus", check);
      // Another Velora tab changed the timer or history.
      window.addEventListener("storage", (e) => {
        if (e.key !== saved.key && e.key !== prefs.key) return;
        data = saved.read();
        sound = prefs.read().sound;
        schedule();
        emit();
      });
    }
  }
  return data;
}

function emit() {
  for (const l of listeners) l();
}

function set(next: FocusData) {
  if (next === data) return;
  data = next;
  saved.write(next);
  schedule();
  emit();
}

function schedule() {
  if (wake !== null) clearTimeout(wake);
  wake = null;
  const t = data?.timer;
  if (t?.status === "running" && t.endsAt !== null) wake = setTimeout(check, Math.min(2 ** 31 - 1, Math.max(0, t.endsAt - Date.now()) + 30));
}

function check() {
  const r = engine.settle(current(), Date.now(), mode);
  if (!r.completed) return schedule();
  lastCompleted = r.completed;
  set(r.data);
  if (soundOn()) playChime();
}

function soundOn(): boolean {
  sound ??= prefs.read().sound;
  return sound;
}

export const focus = {
  get: current,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => void listeners.delete(l);
  },
  /** False when the browser keeps nothing between visits. */
  persistent: saved.persistent,
  /** The session that most recently ran out, for announcements. */
  lastCompleted: () => lastCompleted,
  setMode(m: FocusMode) {
    mode = m;
  },
  start: () => set(engine.start(current(), Date.now())),
  pause: () => set(engine.pause(current(), Date.now())),
  resume: () => set(engine.resume(current(), Date.now())),
  reset: () => set(engine.reset(current())),
  select: (k: FocusKind) => set(engine.select(current(), k)),
  setSettings: (s: Partial<FocusSettings>) => set(engine.setSettings(current(), s)),
  /** Marks today active in the current mode. Writes only the first time each day. */
  activity: () => set(engine.recordActivity(current(), Date.now(), mode)),
  sound: soundOn,
  setSound(on: boolean) {
    sound = on;
    prefs.write({ sound: on });
    emit();
  },
};

export function useFocus(): FocusData {
  return useSyncExternalStore(focus.subscribe, focus.get, focus.get);
}

export function useSound(): boolean {
  return useSyncExternalStore(focus.subscribe, focus.sound, focus.sound);
}
