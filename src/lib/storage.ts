import { createMMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

/**
 * Synchronous key-value storage.
 *
 * Chosen over SQLite deliberately: a heavy user plays ~200 matches a year at ~60
 * points each, so the whole local corpus is well under a megabyte of JSON.
 * Revisit if a single user's archive passes ~5 MB (roughly 15,000 matches).
 *
 * Synchronous matters here — the live match is written on every point, and a
 * crash between a tap and an async flush would lose a point mid-argument.
 *
 * react-native-mmkv v4 rewrote its API around Nitro modules: `new MMKV()` is
 * gone in favour of `createMMKV()`, and `.delete()` is now `.remove()`. The
 * handoff's starter code targets the older API — updated here to match what's
 * actually installed.
 */
export const storage = createMMKV({ id: 'rackettrack' });

export const zustandStorage: StateStorage = {
  setItem: (key, value) => storage.set(key, value),
  getItem: (key) => storage.getString(key) ?? null,
  removeItem: (key) => storage.remove(key),
};

export function readJSON<T>(key: string, fallback: T): T {
  const raw = storage.getString(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  storage.set(key, JSON.stringify(value));
}
