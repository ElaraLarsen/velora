// The one place Velora reads and writes browser storage. Only small, non-code records go here:
// focus settings and history, activity days, deadlines and preferences. Uploaded files, claims and
// evidence stay in memory (see project/store.tsx).
//
// Every read is validated. Storage that is missing, blocked (private windows, disabled site data),
// full or holding something unreadable never breaks the app: reads fall back to defaults and writes
// report failure instead of throwing.

import type { ZodType } from "zod";

export interface KeyValue {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

/** The browser's localStorage, or null when it can't be used. */
export function browserStorage(): KeyValue | null {
  try {
    const s = globalThis.localStorage;
    if (!s) return null;
    const probe = "velora.__probe";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return { get: (k) => s.getItem(k), set: (k, v) => s.setItem(k, v), remove: (k) => s.removeItem(k) };
  } catch {
    return null;
  }
}

/** An in-memory KeyValue, for tests and as a stand-in when the browser has no storage. */
export function memoryStorage(seed: Record<string, string> = {}): KeyValue {
  const m = new Map(Object.entries(seed));
  return { get: (k) => m.get(k) ?? null, set: (k, v) => void m.set(k, v), remove: (k) => void m.delete(k) };
}

export interface StoredRecord<T> {
  /** The saved value, or the fallback when nothing valid is saved. */
  read(): T;
  /** True when the value was saved. */
  write(value: T): boolean;
  /** False when this browser won't keep anything (values then last only until the page closes). */
  readonly persistent: boolean;
  readonly key: string;
}

/**
 * One versioned record under `key`. A value that fails `schema` is moved aside to `<key>.unreadable`
 * (so nothing is silently lost) and the fallback is used.
 */
export function storedRecord<T>(key: string, schema: ZodType<T>, fallback: () => T, kv: KeyValue | null = browserStorage()): StoredRecord<T> {
  return {
    key,
    persistent: kv !== null,
    read() {
      if (!kv) return fallback();
      let raw: string | null = null;
      try {
        raw = kv.get(key);
        if (raw === null) return fallback();
        const parsed = schema.safeParse(JSON.parse(raw));
        if (parsed.success) return parsed.data;
      } catch {
        // Unreadable JSON, or storage that failed on read: handled below.
      }
      try {
        if (raw !== null) kv.set(`${key}.unreadable`, raw);
        kv.remove(key);
      } catch {
        // Nothing more can be done; the fallback still works.
      }
      return fallback();
    },
    write(value) {
      if (!kv) return false;
      try {
        kv.set(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
  };
}
