import type { LiveMatch, RosterPlayer } from '@/features/match/matchStore';
import type { MatchState } from '@/features/scoring/types';
import { readJSON, writeJSON } from './storage';

const KEY = 'rackettrack.archive';

/**
 * The durable local record of a finished match — the read path for history,
 * the home ladder, and recap. Independent of the outbox: a match stays here
 * whether or not it has synced, so "unsynced" is just a flag, not a different
 * storage location.
 */
export interface ArchivedMatch {
  clientId: string;
  serverId: string | null;
  squadId: string | null;
  format: LiveMatch['format'];
  court: string;
  teams: [RosterPlayer[], RosterPlayer[]];
  startedAt: number;
  endedAt: number;
  timeline: MatchState['timeline'];
  sets: MatchState['sets'];
  status: 'complete' | 'abandoned';
  winner: MatchState['winner'];
  synced: boolean;
}

const read = (): ArchivedMatch[] => readJSON<ArchivedMatch[]>(KEY, []);
const write = (rows: ArchivedMatch[]) => writeJSON(KEY, rows);

export function saveMatch(
  live: LiveMatch,
  state: MatchState,
  status: 'complete' | 'abandoned',
): ArchivedMatch {
  const entry: ArchivedMatch = {
    clientId: live.clientId,
    serverId: null,
    squadId: live.squadId,
    format: live.format,
    court: live.court,
    teams: live.teams,
    startedAt: live.startedAt,
    endedAt: live.endedAt ?? Date.now(),
    timeline: state.timeline,
    sets: state.sets,
    status,
    winner: status === 'complete' ? state.winner : null,
    synced: false,
  };
  const rows = read().filter((r) => r.clientId !== entry.clientId);
  rows.unshift(entry);
  write(rows);
  return entry;
}

/** Newest first. */
export function listMatches(): ArchivedMatch[] {
  return [...read()].sort((a, b) => b.endedAt - a.endedAt);
}

export function getMatch(clientId: string): ArchivedMatch | null {
  return read().find((r) => r.clientId === clientId) ?? null;
}

export function markSynced(clientId: string, serverId: string): void {
  write(read().map((r) => (r.clientId === clientId ? { ...r, synced: true, serverId } : r)));
}
