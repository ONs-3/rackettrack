import type { ArchivedMatch } from '@/lib/archive';
import type { MatchState, TeamIndex } from '@/features/scoring/types';

export interface LadderRow {
  rank: number;
  name: string;
  wins: number;
  losses: number;
  streak: number;
  hot: boolean;
}

interface PlayerAgg {
  name: string;
  wins: number;
  losses: number;
  /** Most recent results, newest first: true = win. */
  recent: boolean[];
}

/**
 * Guest mode has no accounts, so there is no server-side player_records view to
 * read (04-screens.md's spec for the ladder). This derives the same shape from
 * the local archive: every named player across completed matches, ranked by
 * wins then win rate. Once squads exist (phase 4) this becomes the offline
 * fallback, matching the sync architecture in 06-offline-sync-and-push.md.
 */
export function buildLadder(matches: ArchivedMatch[]): LadderRow[] {
  const byName = new Map<string, PlayerAgg>();

  // Oldest first, so `recent` (unshifted) ends up newest-first.
  const chronological = [...matches]
    .filter((m) => m.status === 'complete' && m.winner !== null)
    .sort((a, b) => a.endedAt - b.endedAt);

  for (const m of chronological) {
    const winner = m.winner as 0 | 1;
    const loser = winner === 0 ? 1 : 0;
    for (const teamIndex of [0, 1] as const) {
      const won = teamIndex === winner;
      for (const p of m.teams[teamIndex]) {
        const agg = byName.get(p.displayName) ?? { name: p.displayName, wins: 0, losses: 0, recent: [] };
        if (won) agg.wins += 1;
        else agg.losses += 1;
        agg.recent.unshift(won);
        byName.set(p.displayName, agg);
      }
    }
    void loser;
  }

  const rows = [...byName.values()]
    .sort((a, b) => b.wins - a.wins || b.wins / (b.wins + b.losses) - a.wins / (a.wins + a.losses))
    .map((agg, i) => {
      let streak = 0;
      for (const win of agg.recent) {
        if (!win) break;
        streak += 1;
      }
      return {
        rank: i + 1,
        name: agg.name,
        wins: agg.wins,
        losses: agg.losses,
        streak,
        hot: streak >= 3,
      };
    });

  return rows;
}

/** The player appearing in the most matches — the closest guest mode gets to "you". */
export function primaryPlayerName(matches: ArchivedMatch[]): string | null {
  const counts = new Map<string, number>();
  for (const m of matches) {
    for (const team of m.teams) {
      for (const p of team) counts.set(p.displayName, (counts.get(p.displayName) ?? 0) + 1);
    }
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}

export interface Streak {
  kind: 'W' | 'L';
  count: number;
}

/** Trailing win or loss streak for a named player, newest match first. */
export function trailingStreak(matches: ArchivedMatch[], name: string): Streak | null {
  const chronological = [...matches]
    .filter((m) => m.status === 'complete' && m.winner !== null)
    .sort((a, b) => b.endedAt - a.endedAt);

  let streak: Streak | null = null;
  for (const m of chronological) {
    const team = m.teams.findIndex((t) => t.some((p) => p.displayName === name));
    if (team === -1) continue;
    const won = team === m.winner;
    if (streak === null) {
      streak = { kind: won ? 'W' : 'L', count: 1 };
    } else if ((won && streak.kind === 'W') || (!won && streak.kind === 'L')) {
      streak.count += 1;
    } else {
      break;
    }
  }
  return streak;
}

export function playerRecord(matches: ArchivedMatch[], name: string): { wins: number; losses: number } {
  let wins = 0;
  let losses = 0;
  for (const m of matches) {
    if (m.status !== 'complete' || m.winner === null) continue;
    const team = m.teams.findIndex((t) => t.some((p) => p.displayName === name));
    if (team === -1) continue;
    if (team === m.winner) wins += 1;
    else losses += 1;
  }
  return { wins, losses };
}

export function courtTime(matches: ArchivedMatch[]): string {
  const totalMs = matches.reduce((sum, m) => sum + Math.max(0, m.endedAt - m.startedAt), 0);
  const hours = totalMs / 3_600_000;
  if (hours < 1) return `${Math.round(totalMs / 60_000)}m`;
  return `${Math.round(hours)}h`;
}

export function formatDuration(startedAt: number, endedAt: number): string {
  const total = Math.max(0, Math.floor((endedAt - startedAt) / 60000));
  return `${total} min`;
}

/** "4-point run to close" — the trailing streak that ended a completed match. */
export function finishStreakLine(state: MatchState): string {
  const line = state.timeline;
  if (line.length === 0) return '';
  const last = line[line.length - 1];
  let count = 0;
  for (let i = line.length - 1; i >= 0 && line[i] === last; i--) count += 1;
  return `${count}-point run to close`;
}

/** Who held the advantage when a match was abandoned early. */
export function whoWasAhead(state: MatchState): TeamIndex | null {
  if (state.setsWon[0] !== state.setsWon[1]) return state.setsWon[0] > state.setsWon[1] ? 0 : 1;
  if (state.games[0] !== state.games[1]) return state.games[0] > state.games[1] ? 0 : 1;
  if (state.points[0] !== state.points[1]) return state.points[0] > state.points[1] ? 0 : 1;
  return null;
}
