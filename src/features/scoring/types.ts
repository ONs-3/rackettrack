/**
 * Padel scoring engine — types.
 * Pure TypeScript. No React, no async, no dependencies.
 */

export type TeamIndex = 0 | 1;

export type SportId = 'padel' | 'badminton' | 'tennis';

export interface MatchFormat {
  sport: SportId;
  /** First to 2 sets (bestOf 3) or first to 1 (bestOf 1). */
  bestOf: 1 | 3;
  /** No-advantage scoring: 40-40 is decided by the next point. */
  goldenPoint: boolean;
  /** Games needed to win a set, before margin. Padel: 6. */
  gamesPerSet: number;
  /** Game score at which a tiebreak begins. Padel: 6. */
  tiebreakAt: number;
  /** Points needed to win a tiebreak, before margin. Padel: 7. */
  tiebreakTo: number;
}

export const PADEL_DEFAULT_FORMAT: MatchFormat = {
  sport: 'padel',
  bestOf: 3,
  goldenPoint: true,
  gamesPerSet: 6,
  tiebreakAt: 6,
  tiebreakTo: 7,
};

export interface SetResult {
  games: [number, number];
  tiebreak: boolean;
}

export interface MatchState {
  /** Point values within the current game. 0..4 mapping to 0/15/30/40/AD, or raw count in a tiebreak. */
  points: [number, number];
  /** Games won in the current set. */
  games: [number, number];
  /** Completed sets, in order. */
  sets: SetResult[];
  setsWon: [number, number];
  tiebreak: boolean;
  serving: TeamIndex;
  /** The durable record: who won each point, in order. Everything above derives from this. */
  timeline: TeamIndex[];
  status: 'live' | 'complete';
  winner: TeamIndex | null;
}

export type SituationKind =
  | 'match-point'
  | 'set-point'
  | 'game-point'
  | 'golden-point'
  | 'deuce'
  | 'tiebreak-tight'
  | 'streak';

export interface Situation {
  kind: SituationKind;
  /** The team the situation favours, or null when it favours neither. */
  team: TeamIndex | null;
  /** Ticker copy, already uppercased. */
  label: string;
}

export interface RuleSet {
  id: SportId;
  label: string;
  defaultFormat: MatchFormat;
  pointLabel(state: MatchState, team: TeamIndex): string;
  reduce(format: MatchFormat, state: MatchState, team: TeamIndex): MatchState;
  situation(format: MatchFormat, state: MatchState): Situation | null;
}
