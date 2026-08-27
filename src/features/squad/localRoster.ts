import * as Crypto from 'expo-crypto';
import type { RosterPlayer } from '@/features/match/matchStore';
import { readJSON, writeJSON } from '@/lib/storage';

const KEY = 'rackettrack.localRoster';

/**
 * Guest-mode roster: names typed into New match, remembered locally as
 * suggestions. Once squads exist (phase 4) this becomes the offline fallback
 * for `squad_players` — never write a raw name string into a match, always
 * resolve or create a roster row first, so claiming later has something to
 * attach to.
 */
export function getLocalRoster(): RosterPlayer[] {
  return readJSON<RosterPlayer[]>(KEY, []);
}

/** Find an existing player by name (case-insensitive) or create a local one. */
export function resolvePlayer(displayName: string): RosterPlayer {
  const name = displayName.trim();
  const roster = getLocalRoster();
  const existing = roster.find((p) => p.displayName.toLowerCase() === name.toLowerCase());
  if (existing) return existing;

  const player: RosterPlayer = { id: Crypto.randomUUID(), displayName: name };
  writeJSON(KEY, [player, ...roster]);
  return player;
}
