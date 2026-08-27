import type {
  MatchFormat,
  MatchState,
  Situation,
  TeamIndex,
} from './types';

export const POINT_LABELS = ['0', '15', '30', '40', 'AD'] as const;

const other = (t: TeamIndex): TeamIndex => (t === 0 ? 1 : 0);

export function emptyState(): MatchState {
  return {
    points: [0, 0],
    games: [0, 0],
    sets: [],
    setsWon: [0, 0],
    tiebreak: false,
    serving: 0,
    timeline: [],
    status: 'live',
    winner: null,
  };
}

/** Would `team` win the current game by taking the next point? */
export function wouldWinGame(f: MatchFormat, s: MatchState, team: TeamIndex): boolean {
  const o = other(team);
  const mine = s.points[team];
  const theirs = s.points[o];

  if (s.tiebreak) {
    return mine + 1 >= f.tiebreakTo && mine + 1 - theirs >= 2;
  }
  // AD -> game.
  if (mine === 4) return true;
  if (mine === 3) {
    if (theirs < 3) return true;
    // 40-40: golden point decides immediately, otherwise it only earns AD.
    if (theirs === 3) return f.goldenPoint;
  }
  return false;
}

/** Would `team` win the current set by taking the next point? */
export function wouldWinSet(f: MatchFormat, s: MatchState, team: TeamIndex): boolean {
  if (!wouldWinGame(f, s, team)) return false;
  if (s.tiebreak) return true;
  const mine = s.games[team] + 1;
  const theirs = s.games[other(team)];
  return mine >= f.gamesPerSet && mine - theirs >= 2;
}

/** Would `team` win the match by taking the next point? */
export function wouldWinMatch(f: MatchFormat, s: MatchState, team: TeamIndex): boolean {
  if (!wouldWinSet(f, s, team)) return false;
  const needed = f.bestOf === 1 ? 1 : 2;
  return s.setsWon[team] + 1 >= needed;
}

/**
 * Apply one point. Returns a NEW state; never mutates.
 * Prefer `replay()` as the source of truth — this is its per-point step.
 */
function step(f: MatchFormat, prev: MatchState, team: TeamIndex): MatchState {
  if (prev.status === 'complete') return prev;

  const o = other(team);
  const s: MatchState = {
    ...prev,
    points: [...prev.points] as [number, number],
    games: [...prev.games] as [number, number],
    sets: prev.sets.map((x) => ({ games: [...x.games] as [number, number], tiebreak: x.tiebreak })),
    setsWon: [...prev.setsWon] as [number, number],
    timeline: [...prev.timeline, team],
  };

  const gameWon = wouldWinGame(f, prev, team);
  const setWon = wouldWinSet(f, prev, team);
  const matchWon = wouldWinMatch(f, prev, team);

  if (gameWon) {
    if (setWon) {
      const games: [number, number] = [...s.games] as [number, number];
      games[team] += 1;
      s.sets.push({ games, tiebreak: s.tiebreak });
      s.setsWon[team] += 1;
      s.games = [0, 0];
      s.points = [0, 0];
      s.tiebreak = false;
      if (matchWon) {
        s.status = 'complete';
        s.winner = team;
      }
    } else {
      s.games[team] += 1;
      s.points = [0, 0];
      if (s.games[0] === f.tiebreakAt && s.games[1] === f.tiebreakAt) s.tiebreak = true;
    }
    if (s.status !== 'complete') s.serving = other(s.serving);
    return s;
  }

  if (s.tiebreak) {
    s.points[team] += 1;
    // Serve changes after the first tiebreak point, then every two.
    const played = s.points[0] + s.points[1];
    if (played % 2 === 1) s.serving = other(s.serving);
    return s;
  }

  // Standard game progression.
  if (s.points[team] === 3 && s.points[o] === 4) {
    // Opponent held AD and lost the point: back to deuce.
    s.points[o] = 3;
  } else if (s.points[team] === 3 && s.points[o] === 3) {
    // Golden point is handled above (it wins the game), so this is advantage scoring.
    s.points[team] = 4;
  } else {
    s.points[team] += 1;
  }
  return s;
}

/**
 * THE primitive. Rebuild full match state from the durable timeline.
 * A 200-point replay is microseconds; do not optimise this into a mutable accumulator.
 */
export function replay(f: MatchFormat, timeline: TeamIndex[]): MatchState {
  let s = emptyState();
  for (const t of timeline) s = step(f, s, t);
  return s;
}

export function awardPoint(f: MatchFormat, s: MatchState, team: TeamIndex): MatchState {
  if (s.status === 'complete') return s;
  return step(f, s, team);
}

export function undoPoint(f: MatchFormat, s: MatchState): MatchState {
  if (s.timeline.length === 0) return s;
  return replay(f, s.timeline.slice(0, -1));
}

export function pointLabel(s: MatchState, team: TeamIndex): string {
  if (s.tiebreak) return String(s.points[team]);
  return POINT_LABELS[s.points[team]] ?? '0';
}

/**
 * What is at stake on the next point. Drives the hype ticker.
 * Evaluation order is significant — see 03-scoring-engine.md.
 */
export function situation(f: MatchFormat, s: MatchState): Situation | null {
  if (s.status === 'complete') return null;

  if (s.tiebreak && s.points[0] >= f.tiebreakTo - 2 && s.points[1] >= f.tiebreakTo - 2) {
    return { kind: 'tiebreak-tight', team: null, label: 'TIEBREAK — TIGHT' };
  }

  const atDeuce = !s.tiebreak && s.points[0] === 3 && s.points[1] === 3;
  if (atDeuce && f.goldenPoint) {
    return { kind: 'golden-point', team: null, label: 'GOLDEN POINT' };
  }

  const teams: TeamIndex[] = [0, 1];
  for (const t of teams) if (wouldWinMatch(f, s, t)) return { kind: 'match-point', team: t, label: 'MATCH POINT' };
  for (const t of teams) if (wouldWinSet(f, s, t)) return { kind: 'set-point', team: t, label: 'SET POINT' };
  for (const t of teams) if (wouldWinGame(f, s, t)) return { kind: 'game-point', team: t, label: 'GAME POINT' };

  if (atDeuce) return { kind: 'deuce', team: null, label: 'DEUCE' };

  const last = s.timeline.slice(-4);
  if (last.length === 4 && last.every((x) => x === last[0])) {
    return { kind: 'streak', team: last[0], label: '4 IN A ROW' };
  }

  return null;
}

/** "6-4 3-6 7-5", or "2-1*" for an unfinished set when the match was abandoned. */
export function scoreline(s: MatchState): string {
  const parts = s.sets.map((x) => `${x.games[0]}-${x.games[1]}`);
  if (s.status !== 'complete' && (s.games[0] > 0 || s.games[1] > 0)) {
    parts.push(`${s.games[0]}-${s.games[1]}*`);
  }
  return parts.join(' ') || '0-0';
}
