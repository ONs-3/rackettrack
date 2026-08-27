import type { LiveMatch } from '@/features/match/matchStore';
import type { MatchState } from '@/features/scoring/types';
import type { Json } from '@/types/database';
import { resolveRosterIds } from '@/features/squad/rosterSync';
import { readJSON, writeJSON } from './storage';
import { isBackendConfigured, supabase } from './supabase';

const KEY = 'rackettrack.outbox';

export interface OutboxEntry {
  client_id: string;
  squad_id: string | null;
  sport: string;
  format: LiveMatch['format'];
  court: string;
  started_at: string;
  ended_at: string | null;
  status: 'complete' | 'abandoned';
  winner_team: number | null;
  // Names, not squad_players ids — the device's local roster ids are
  // meaningless server-side. Resolved (and, for a name the squad hasn't
  // seen, created) at drain time by resolveRosterIds — see 04-screens.md's
  // "a name not on the roster creates a new squad_players row on sync".
  teams: Array<{ team_index: 0 | 1; label: string | null; player_names: string[] }>;
  sets: Array<{ games_a: number; games_b: number; tiebreak: boolean }>;
  timeline: number[];
  /** Local bookkeeping, stripped before the payload is sent. */
  attempts: number;
  lastError?: string;
}

const read = (): OutboxEntry[] => readJSON<OutboxEntry[]>(KEY, []);
const write = (rows: OutboxEntry[]) => writeJSON(KEY, rows);

/**
 * Queue a finished match for sync. Safe to call more than once for the same
 * match — entries are keyed on client_id and the server RPC upserts on it too.
 */
export function enqueueMatch(
  live: LiveMatch,
  state: MatchState,
  status: 'complete' | 'abandoned',
): void {
  const entry: OutboxEntry = {
    client_id: live.clientId,
    squad_id: live.squadId,
    sport: live.format.sport,
    format: live.format,
    court: live.court,
    started_at: new Date(live.startedAt).toISOString(),
    ended_at: new Date(live.endedAt ?? Date.now()).toISOString(),
    status,
    winner_team: status === 'complete' ? state.winner : null,
    teams: [0, 1].map((i) => ({
      team_index: i as 0 | 1,
      label: null,
      player_names: live.teams[i as 0 | 1].map((p) => p.displayName),
    })),
    sets: state.sets.map((s) => ({ games_a: s.games[0], games_b: s.games[1], tiebreak: s.tiebreak })),
    timeline: state.timeline,
    attempts: 0,
  };

  const rows = read().filter((r) => r.client_id !== entry.client_id);
  rows.push(entry);
  write(rows);
}

export function pendingCount(): number {
  return read().length;
}

/** Guest-mode matches queued with no squad yet — the ones the "add your N offline
 * matches?" prompt (06-offline-sync-and-push.md) offers to claim after sign-in. */
export function unclaimedCount(): number {
  return read().filter((r) => r.squad_id === null).length;
}

/** Attach every unclaimed guest-mode match to a squad, ready to sync. */
export function claimGuestMatches(squadId: string): void {
  write(read().map((r) => (r.squad_id === null ? { ...r, squad_id: squadId } : r)));
}

/**
 * Try to push everything queued. Call on app foreground, on regaining network,
 * and after ending a match. Failures stay queued — never drop a match because
 * the backend was asleep (the free tier pauses after ~7 days idle).
 */
export async function drainOutbox(): Promise<{ sent: number; failed: number }> {
  const rows = read();
  if (rows.length === 0) return { sent: 0, failed: 0 };
  // No project configured yet — stay queued, try again later.
  if (!isBackendConfigured || !supabase) return { sent: 0, failed: rows.length };

  const remaining: OutboxEntry[] = [];
  let sent = 0;

  for (const row of rows) {
    // matches.squad_id is NOT NULL — an unclaimed guest match has nowhere to
    // sync to yet. Leave it queued until claimGuestMatches() attaches a squad.
    if (row.squad_id === null) {
      remaining.push(row);
      continue;
    }

    const { attempts, lastError, teams, ...rest } = row;

    try {
      const allNames = teams.flatMap((t) => t.player_names);
      const idByName = await resolveRosterIds(row.squad_id!, allNames);
      const payload = {
        ...rest,
        teams: teams.map((t) => ({
          team_index: t.team_index,
          label: t.label,
          player_ids: t.player_names.map((n) => idByName[n.trim()]),
        })),
      };
      // MatchFormat etc. are concrete interfaces, not index-signature records,
      // so they never structurally satisfy Json — the standard cast for it.
      const { error } = await supabase.rpc('sync_match', { payload: payload as unknown as Json });

      if (error) {
        // A squad the user has since left will never succeed; stop retrying it.
        const permanent = error.code === '42501' || error.code === '23503';
        if (!permanent) {
          remaining.push({ ...row, attempts: attempts + 1, lastError: error.message });
        }
        continue;
      }
      sent += 1;
    } catch (e) {
      remaining.push({ ...row, attempts: attempts + 1, lastError: e instanceof Error ? e.message : 'sync failed' });
    }
  }

  write(remaining);
  return { sent, failed: remaining.length };
}
