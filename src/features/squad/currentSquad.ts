import { readJSON, writeJSON } from '@/lib/storage';
import type { Squad } from './squadApi';

const KEY = 'rackettrack.currentSquad';

/**
 * A local, synchronous cache of the signed-in user's active squad. New match
 * reads this directly rather than awaiting a network call — no read or write
 * is ever on the critical path of starting a match (06-offline-sync-and-push.md).
 * Refreshed whenever the squad screen fetches successfully.
 */
export function getCachedSquad(): Squad | null {
  return readJSON<Squad | null>(KEY, null);
}

export function setCachedSquad(squad: Squad | null): void {
  writeJSON(KEY, squad);
}
