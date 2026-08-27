# 03 — Scoring engine

The engine is the product. Build and test it **before any UI**. It is pure TypeScript with no React,
no async, and no dependencies.

`starter/src/features/scoring/` contains a complete, working implementation and its test file. This
document is the specification those files satisfy — read it to review the code, and to write the
second sport later.

## Padel rules, precisely

### Points within a game

Points are labelled `0, 15, 30, 40, AD`. Internally they are integers `0..4`.

- A team winning a point at `40` with the opponent below `40` wins the game.
- At `40–40` (**deuce**) behaviour depends on the format flag:
  - **Golden point ON** (`goldenPoint: true`): the next point wins the game. No advantage.
  - **Golden point OFF**: the winner of the next point goes to `AD`. From `AD`, winning the next
    point wins the game; **losing** it returns both teams to `40–40`.
- Golden point is the default. It is how casual padel is actually played and it caps game length.

### Games within a set

- First to **6 games**, needing a **margin of 2**.
- At **6–6** the set is decided by a **tiebreak**.
- The set score is recorded including the tiebreak game — a tiebreak set finishes `7–6`.

### Tiebreak

- Points count `0, 1, 2, 3, …` — plain integers, no 15/30/40.
- First to **7**, margin of **2**. A tiebreak can therefore run past 7 (`9–7`, `12–10`).
- The tiebreak counts as one game. Winning it wins the set.

### Sets within a match

- `bestOf: 3` → first to **2** sets. `bestOf: 1` → first to **1**.
- The match ends the instant the deciding set is won. No further points can be recorded.

### Serving

Padel serving in full is per-player and side-dependent. **V1 models serve at team level only**,
which is what the design shows:

- Serve alternates **team** at the end of every game.
- Within a tiebreak, serve changes after the **first point**, then after **every two points**.
- The team serving first in a match is team A. (A coin-toss picker is a v2 nicety — leave a TODO.)

Do not model individual servers or court sides in v1. It doubles the state and the design does not
surface it.

## Public API

```ts
// Immutable, derived from scratch each time. This is the only way to build state.
replay(format: MatchFormat, timeline: TeamIndex[]): MatchState

// Convenience wrappers over replay.
awardPoint(format: MatchFormat, state: MatchState, team: TeamIndex): MatchState
undoPoint(format: MatchFormat, state: MatchState): MatchState

// Pure derivations for the UI.
situation(format: MatchFormat, state: MatchState): Situation | null
pointLabel(state: MatchState, team: TeamIndex): string
```

`replay` is the primitive; the other two are one-liners over it. Resist adding an incremental
`applyPoint` that mutates — the performance saving is irrelevant (a 60-point replay is
microseconds) and the correctness cost is real.

## Situations — the hype layer

`situation()` inspects the state *before* the next point and reports what is at stake. This is what
lights the ticker. Evaluate in this order and return the **first** match:

| Order | Condition | `kind` | `team` | Ticker copy |
|---|---|---|---|---|
| 1 | Match is complete | `null` | — | — |
| 2 | Tiebreak and both teams ≥ 5 | `tiebreak-tight` | `null` | `TIEBREAK — TIGHT` |
| 3 | Golden point on, not tiebreak, `40–40` | `golden-point` | `null` | `GOLDEN POINT` |
| 4 | A team would win the **match** on the next point | `match-point` | that team | `MATCH POINT` |
| 5 | A team would win the **set** on the next point | `set-point` | that team | `SET POINT` |
| 6 | A team would win the **game** on the next point | `game-point` | that team | `GAME POINT` |
| 7 | Not tiebreak and `40–40` (golden off) | `deuce` | `null` | `DEUCE` |
| 8 | Last 4 points all won by the same team | `streak` | that team | `4 IN A ROW` |
| 9 | Otherwise | `null` | — | resting state |

Order matters: golden point is checked before game point because at `40–40` with golden on, *both*
teams have game point, and "GOLDEN POINT" is the more informative call. When rows 4–6 are evaluated,
check team A before team B — at golden point that branch is unreachable anyway.

When `situation()` returns `null`, the ticker shows the point timeline instead. This is the resting
state and it should be the majority of the match — if the ticker is lit more than about a fifth of
the time, the hype has stopped meaning anything. Do not add more situations without deleting one.

## Test matrix

`starter/src/features/scoring/engine.test.ts` implements all of these. Every row must stay green.

### Points

| # | Setup | Expect |
|---|---|---|
| P1 | Four points to A from `0–0` | A wins the game, score resets `0–0`, A games = 1 |
| P2 | `40–0`, B wins three | `40–40` |
| P3 | Golden **off**, from `40–40` A wins one | A shows `AD`, B `40` |
| P4 | Golden **off**, `AD–40` to A, B wins one | back to `40–40` |
| P5 | Golden **off**, `AD–40` to A, A wins one | A wins the game |
| P6 | Golden **on**, from `40–40` A wins one | A wins the game immediately, no `AD` ever appears |
| P7 | Golden **on**, replay a 40-point timeline | no state in the replay ever has a point value of 4 |

### Games and sets

| # | Setup | Expect |
|---|---|---|
| G1 | A wins 6 games, B wins 0 | Set to A, recorded `6–0`, A sets = 1 |
| G2 | A 5 games, B 5, A wins one | `6–5`, **set not over** (margin 1) |
| G3 | From `6–5` A wins another | Set to A `7–5` |
| G4 | Games reach `5–5`, then `6–6` | `tiebreak === true` |
| G5 | Serve alternates | after each completed game, `serving` flips |

### Tiebreak

| # | Setup | Expect |
|---|---|---|
| T1 | In tiebreak, A reaches 7, B on 3 | Set to A, recorded `7–6`, `tiebreak` cleared |
| T2 | Tiebreak `6–6`, A wins one | `7–6`, **not over** |
| T3 | Tiebreak `7–7`, A wins two | Set to A at `9–7` in the tiebreak |
| T4 | Tiebreak serve | changes after point 1, then every 2 points |
| T5 | Tiebreak point labels | render as `0,1,2,…`, never `15/30/40` |

### Match

| # | Setup | Expect |
|---|---|---|
| M1 | `bestOf: 3`, A wins two sets | `status: 'complete'`, `winner: 0` |
| M2 | `bestOf: 3`, one set each, decider to B | `winner: 1`, three sets recorded |
| M3 | `bestOf: 1`, A wins one set | match complete |
| M4 | Award a point after completion | state unchanged, no throw |
| M5 | Undo from any state | equals `replay(format, timeline.slice(0, -1))` |
| M6 | Undo at `0` points | returns a valid empty state, does not throw |

### Situations

| # | Setup | Expect |
|---|---|---|
| S1 | `40–30` to A, first set | `game-point`, team 0 |
| S2 | A 5 games, `40–30`, opponent on 3 games | `set-point`, team 0 |
| S3 | A one set up, 5 games, `40–30` | `match-point`, team 0 |
| S4 | Golden on, `40–40` | `golden-point`, team `null` |
| S5 | Golden off, `40–40` | `deuce`, team `null` |
| S6 | Tiebreak `5–5` | `tiebreak-tight` |
| S7 | Four straight points to B, otherwise quiet | `streak`, team 1 |
| S8 | Match complete | `null` |

### Property test (worth the twenty minutes)

Generate 1,000 random timelines of 0–200 points under both golden settings and assert, for every
prefix:

- `setsWon[0] + setsWon[1] === sets.length`
- neither team's games exceed 7 in a recorded set
- no recorded set is `7–7` or worse without being a tiebreak
- once `status === 'complete'`, further points do not change the state
- `replay(format, timeline)` is deterministic — same input, identical output

This catches the boundary bugs that a hand-written table misses, particularly around `6–5` and long
tiebreaks.

## Adding a second sport later

Do not generalise now. When badminton or tennis arrives, the shape is:

```ts
interface RuleSet {
  id: 'padel' | 'badminton' | 'tennis';
  label: string;
  defaultFormat: MatchFormat;
  pointLabel(state: MatchState, team: TeamIndex): string;
  reduce(format: MatchFormat, state: MatchState, team: TeamIndex): MatchState;
  situation(format: MatchFormat, state: MatchState): Situation | null;
}
```

`padel.ts` already conforms to this. Badminton differs in ways worth knowing before you design
around padel's assumptions: rally scoring to 21, cap at 30, margin of 2, best of 3 **games** not
sets, and serve follows the point winner rather than alternating by game. The `MatchState` shape
survives all of that; only `reduce` and `pointLabel` change. Keep it that way.
