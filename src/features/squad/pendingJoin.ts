import { readJSON, writeJSON } from '@/lib/storage';

const KEY = 'rackettrack.pendingJoinCode';

/** An invite code opened while signed out, held until sign-in completes. */
export const getPendingJoinCode = (): string | null => readJSON<string | null>(KEY, null);
export const setPendingJoinCode = (code: string): void => writeJSON(KEY, code);
export const clearPendingJoinCode = (): void => writeJSON(KEY, null);
