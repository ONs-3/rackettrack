import {
  awardPoint,
  emptyState,
  pointLabel,
  replay,
  scoreline,
  situation,
  undoPoint,
} from './engine';
import { PADEL_DEFAULT_FORMAT, type MatchFormat, type TeamIndex } from './types';

const GOLDEN: MatchFormat = { ...PADEL_DEFAULT_FORMAT };
const ADV: MatchFormat = { ...PADEL_DEFAULT_FORMAT, goldenPoint: false };
const BO1: MatchFormat = { ...PADEL_DEFAULT_FORMAT, bestOf: 1 };

/** Build a timeline: `t(0, 4)` = four points to team A. */
const t = (team: TeamIndex, n: number): TeamIndex[] => Array.from({ length: n }, () => team);
/** Alternate points so both teams gain games without either running away with the set. */
const games = (order: TeamIndex[]): TeamIndex[] => order.flatMap((team) => t(team, 4));

describe('points within a game', () => {
  it('P1 four points wins the game from love', () => {
    const s = replay(GOLDEN, t(0, 4));
    expect(s.games).toEqual([1, 0]);
    expect(s.points).toEqual([0, 0]);
  });

  it('P2 40-0 pulled back to 40-40', () => {
    const s = replay(GOLDEN, [0, 0, 0, 1, 1, 1]);
    expect(pointLabel(s, 0)).toBe('40');
    expect(pointLabel(s, 1)).toBe('40');
  });

  it('P3 advantage scoring reaches AD', () => {
    const s = replay(ADV, [0, 0, 0, 1, 1, 1, 0]);
    expect(pointLabel(s, 0)).toBe('AD');
    expect(pointLabel(s, 1)).toBe('40');
  });

  it('P4 losing on AD returns to deuce', () => {
    const s = replay(ADV, [0, 0, 0, 1, 1, 1, 0, 1]);
    expect(pointLabel(s, 0)).toBe('40');
    expect(pointLabel(s, 1)).toBe('40');
  });

  it('P5 winning on AD takes the game', () => {
    const s = replay(ADV, [0, 0, 0, 1, 1, 1, 0, 0]);
    expect(s.games).toEqual([1, 0]);
  });

  it('P6 golden point decides at 40-40 with no advantage', () => {
    const s = replay(GOLDEN, [0, 0, 0, 1, 1, 1, 0]);
    expect(s.games).toEqual([1, 0]);
  });

  it('P7 AD never appears under golden point', () => {
    const line: TeamIndex[] = Array.from({ length: 40 }, (_, i) => ((i * 7) % 3 === 0 ? 1 : 0) as TeamIndex);
    for (let i = 0; i <= line.length; i++) {
      const s = replay(GOLDEN, line.slice(0, i));
      expect(s.points[0]).toBeLessThan(4);
      expect(s.points[1]).toBeLessThan(4);
    }
  });
});

describe('games and sets', () => {
  it('G1 six straight games wins the set 6-0', () => {
    const s = replay(GOLDEN, t(0, 24));
    expect(s.sets).toEqual([{ games: [6, 0], tiebreak: false }]);
    expect(s.setsWon).toEqual([1, 0]);
  });

  it('G2 6-5 does not win the set', () => {
    const order: TeamIndex[] = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
    const s = replay(GOLDEN, games(order));
    expect(s.games).toEqual([6, 5]);
    expect(s.sets).toHaveLength(0);
  });

  it('G3 7-5 wins the set', () => {
    const order: TeamIndex[] = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0];
    const s = replay(GOLDEN, games(order));
    expect(s.sets).toEqual([{ games: [7, 5], tiebreak: false }]);
  });

  it('G4 6-6 starts a tiebreak', () => {
    const order: TeamIndex[] = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
    const s = replay(GOLDEN, games(order));
    expect(s.tiebreak).toBe(true);
    expect(s.games).toEqual([6, 6]);
  });

  it('G5 serve alternates after every completed game', () => {
    const before = replay(GOLDEN, t(0, 3));
    const after = replay(GOLDEN, t(0, 4));
    expect(after.serving).toBe(before.serving === 0 ? 1 : 0);
  });
});

describe('tiebreak', () => {
  const toTiebreak = games([0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1]);

  it('T1 first to seven with margin takes the set 7-6', () => {
    const s = replay(GOLDEN, [...toTiebreak, ...t(0, 7)]);
    expect(s.sets[0]).toEqual({ games: [7, 6], tiebreak: true });
    expect(s.tiebreak).toBe(false);
    expect(s.setsWon).toEqual([1, 0]);
  });

  it('T2 6-6 in a tiebreak does not end it', () => {
    const line: TeamIndex[] = [...toTiebreak];
    for (let i = 0; i < 6; i++) line.push(0, 1);
    const s = replay(GOLDEN, line);
    expect(s.points).toEqual([6, 6]);
    expect(s.sets).toHaveLength(0);
  });

  it('T3 a tiebreak can run to 9-7', () => {
    const line: TeamIndex[] = [...toTiebreak];
    for (let i = 0; i < 7; i++) line.push(0, 1);
    line.push(0, 0);
    const s = replay(GOLDEN, line);
    expect(s.sets[0]).toEqual({ games: [7, 6], tiebreak: true });
  });

  it('T4 serve changes after the first point then every two', () => {
    const base = replay(GOLDEN, toTiebreak);
    const s1 = replay(GOLDEN, [...toTiebreak, 0]);
    const s2 = replay(GOLDEN, [...toTiebreak, 0, 1]);
    const s3 = replay(GOLDEN, [...toTiebreak, 0, 1, 0]);
    expect(s1.serving).not.toBe(base.serving);
    expect(s2.serving).toBe(s1.serving);
    expect(s3.serving).not.toBe(s2.serving);
  });

  it('T5 tiebreak points render as plain integers', () => {
    const s = replay(GOLDEN, [...toTiebreak, 0, 0, 1]);
    expect(pointLabel(s, 0)).toBe('2');
    expect(pointLabel(s, 1)).toBe('1');
  });
});

describe('match completion', () => {
  it('M1 best of three ends after two sets', () => {
    const s = replay(GOLDEN, t(0, 48));
    expect(s.status).toBe('complete');
    expect(s.winner).toBe(0);
    expect(s.sets).toHaveLength(2);
  });

  it('M2 a decider is played when sets are split', () => {
    const line = [...t(0, 24), ...t(1, 24), ...t(1, 24)];
    const s = replay(GOLDEN, line);
    expect(s.winner).toBe(1);
    expect(s.sets).toHaveLength(3);
  });

  it('M3 best of one ends after a single set', () => {
    const s = replay(BO1, t(0, 24));
    expect(s.status).toBe('complete');
    expect(s.sets).toHaveLength(1);
  });

  it('M4 points after completion are ignored', () => {
    const done = replay(GOLDEN, t(0, 48));
    expect(awardPoint(GOLDEN, done, 1)).toEqual(done);
  });

  it('M5 undo equals replaying one point short', () => {
    const line = t(0, 17);
    const s = replay(GOLDEN, line);
    expect(undoPoint(GOLDEN, s)).toEqual(replay(GOLDEN, line.slice(0, -1)));
  });

  it('M6 undo on an empty match is safe', () => {
    expect(undoPoint(GOLDEN, emptyState())).toEqual(emptyState());
  });
});

describe('situations', () => {
  it('S1 game point', () => {
    const s = replay(GOLDEN, [0, 0, 0, 1, 1]);
    expect(situation(GOLDEN, s)).toMatchObject({ kind: 'game-point', team: 0 });
  });

  it('S2 set point', () => {
    const s = replay(GOLDEN, [...games([0, 0, 0, 0, 0, 1, 1, 1]), 0, 0, 0, 1]);
    expect(situation(GOLDEN, s)).toMatchObject({ kind: 'set-point', team: 0 });
  });

  it('S3 match point outranks set point', () => {
    const s = replay(GOLDEN, [...t(0, 24), ...games([0, 0, 0, 0, 0, 1, 1, 1]), 0, 0, 0, 1]);
    expect(situation(GOLDEN, s)).toMatchObject({ kind: 'match-point', team: 0 });
  });

  it('S4 golden point outranks game point', () => {
    const s = replay(GOLDEN, [0, 0, 0, 1, 1, 1]);
    expect(situation(GOLDEN, s)).toMatchObject({ kind: 'golden-point', team: null });
  });

  it('S5 deuce under advantage scoring', () => {
    const s = replay(ADV, [0, 0, 0, 1, 1, 1]);
    expect(situation(ADV, s)).toMatchObject({ kind: 'deuce', team: null });
  });

  it('S6 a tight tiebreak is called out', () => {
    const line: TeamIndex[] = [...games([0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1])];
    for (let i = 0; i < 5; i++) line.push(0, 1);
    expect(situation(GOLDEN, replay(GOLDEN, line))).toMatchObject({ kind: 'tiebreak-tight' });
  });

  it('S7 a four-point streak is called out', () => {
    const s = replay(GOLDEN, [0, 1, 1, 1, 1]);
    expect(situation(GOLDEN, s)).toMatchObject({ kind: 'streak', team: 1 });
  });

  it('S8 a finished match has no situation', () => {
    expect(situation(GOLDEN, replay(GOLDEN, t(0, 48)))).toBeNull();
  });
});

describe('invariants over random timelines', () => {
  // Deterministic PRNG so a failure is reproducible.
  const rand = (seed: number) => () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  it.each([GOLDEN, ADV])('holds for format goldenPoint=%#', (format) => {
    for (let run = 0; run < 250; run++) {
      const next = rand(run * 7919 + 13);
      const line: TeamIndex[] = [];
      for (let i = 0; i < 200; i++) line.push(next() < 0.5 ? 0 : 1);

      let completedAt: number | null = null;
      for (let i = 0; i <= line.length; i++) {
        const s = replay(format, line.slice(0, i));

        expect(s.setsWon[0] + s.setsWon[1]).toBe(s.sets.length);
        for (const set of s.sets) {
          const hi = Math.max(...set.games);
          expect(hi).toBeLessThanOrEqual(7);
          if (hi === 7 && Math.min(...set.games) === 6) expect(set.tiebreak).toBe(true);
        }
        if (s.status === 'complete') {
          if (completedAt === null) completedAt = i;
          expect(s.winner).not.toBeNull();
        }
      }

      if (completedAt !== null) {
        const atEnd = replay(format, line.slice(0, completedAt));
        const later = replay(format, line);
        expect(later.sets).toEqual(atEnd.sets);
        expect(later.winner).toBe(atEnd.winner);
      }
    }
  });

  it('replay is deterministic', () => {
    const line = t(0, 13).concat(t(1, 9));
    expect(replay(GOLDEN, line)).toEqual(replay(GOLDEN, line));
  });
});

describe('scoreline formatting', () => {
  it('renders completed sets', () => {
    expect(scoreline(replay(GOLDEN, t(0, 48)))).toBe('6-0 6-0');
  });

  it('marks an unfinished set with an asterisk', () => {
    expect(scoreline(replay(GOLDEN, t(0, 8)))).toBe('2-0*');
  });
});
