# 01 — Architecture

## The governing idea

**The scoring engine is a pure function, and the match is a list of points.**

Match state is never mutated in place and never stored as a snapshot alone. The durable record of a
match is its `format` plus an ordered array of point winners: `[0, 1, 1, 0, 0, ...]`. Everything
else — current score, games, sets, who is serving, whether it is match point — is *derived* by
replaying that array through a pure reducer.

This one decision buys you, for free:

- **Undo** is `timeline.slice(0, -1)` and a replay. No inverse operations, no undo stack to corrupt.
- **Sync** is trivial and idempotent. A match is an append-only list; the server can accept the same
  payload twice with no harm.
- **Testing** is a table of `(format, timeline) → expected state`. No mocking, no rendering.
- **Auditability.** The point-by-point graphic on the recap screen is the raw data, not a
  reconstruction.
- **A second sport** is a new `RuleSet` implementation over the same timeline shape.

Do not introduce a mutable `currentScore` field that the UI writes to. If you find yourself wanting
one, the derived selector is missing a memo.

## Stack

| Layer | Choice | Why this and not the alternative |
|---|---|---|
| Runtime | Expo SDK (latest stable) managed workflow + dev client | Removes Gradle and Android project maintenance; EAS produces an installable APK with no store account. Bare RN buys control you do not need |
| Language | TypeScript `strict` | The scoring engine is the whole product; types are the cheapest correctness you will buy |
| Routing | Expo Router | File-based, handles deep links (needed for squad invites) with no extra config |
| Local state | Zustand + `persist` over MMKV | The live match is a single small object mutated dozens of times a minute. Zustand has no provider ceremony and no reducer boilerplate. MMKV is synchronous, so a crash mid-match loses nothing |
| Server state | TanStack Query | Caching, retry, and background refetch for history and squads. Its persisted cache is also your offline read path |
| Animation | Reanimated 3 | Runs on the UI thread. The score pop must not stutter when JS is busy |
| Backend | Supabase | Data is genuinely relational (squads → players → matches → sets → points). Postgres + RLS means no server code for v1, and you can add an Edge Function when you need one |
| Storage (local) | MMKV | Synchronous key-value. Data volume is tiny — a few hundred matches is well under a megabyte of JSON |

### On MMKV rather than SQLite

You will read advice to use WatermelonDB or expo-sqlite with Drizzle for offline-first apps. That
advice is right for apps syncing thousands of rows. RacketTrack is not that app: a heavy user plays
200 matches a year, each ~60 points. The whole corpus is smaller than one product photo.

Use MMKV with JSON. Revisit only if a single user's local archive exceeds ~5 MB, which is roughly
15,000 matches. Note the threshold in code so the decision is visible to whoever inherits it.

## Folder structure

```
rackettrack/
├── app/                              # Expo Router — routes only, thin
│   ├── _layout.tsx                   # Providers: Query, SafeArea, fonts, auth gate
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx                 # Home + session ladder
│   │   └── history.tsx               # Match history
│   ├── match/
│   │   ├── new.tsx                   # New match setup
│   │   ├── live.tsx                  # Live scoreboard  ← the core screen
│   │   └── [id].tsx                  # Recap / past match detail
│   ├── squad/
│   │   ├── index.tsx
│   │   └── join/[code].tsx           # Deep-link target for invites
│   └── sign-in.tsx
├── src/
│   ├── features/
│   │   ├── scoring/
│   │   │   ├── types.ts              # MatchFormat, MatchState, RuleSet
│   │   │   ├── padel.ts              # The padel RuleSet
│   │   │   ├── engine.ts             # replay / awardPoint / undo / situation
│   │   │   └── engine.test.ts        # The test matrix from 03-scoring-engine.md
│   │   ├── match/
│   │   │   ├── matchStore.ts         # Zustand: the live match
│   │   │   └── useMatchHistory.ts
│   │   ├── squad/
│   │   └── auth/
│   ├── components/
│   │   ├── TeamZone.tsx              # One half of the live screen
│   │   ├── HypeTicker.tsx            # The strip between the zones
│   │   ├── PillButton.tsx            # The single primary action button
│   │   ├── ListGroup.tsx / ListRow.tsx
│   │   └── PointTimeline.tsx
│   ├── theme/
│   │   ├── tokens.ts                 # Colours, spacing, radii, type, motion
│   │   └── typography.ts             # Font loading + text presets
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── storage.ts                # MMKV instance + Zustand adapter
│   │   ├── outbox.ts                 # Queue of unsynced matches
│   │   └── sync.ts                   # Drain the outbox
│   └── types/database.ts             # Generated: supabase gen types typescript
└── supabase/
    ├── migrations/
    └── functions/notify-squad/       # Edge Function for push on match complete
```

**Rule: `app/` files contain no business logic.** A route reads from a store or a hook, composes
components, and handles navigation. Everything else lives in `src/features`. This keeps the scoring
engine testable without a renderer — and, should the product ever want iOS, makes it a design review
rather than a rewrite.

## Data flow, end to end

```
  TAP on TeamZone
        │
        ▼
  matchStore.awardPoint(team)          ← Zustand action
        │  appends to timeline, calls replay()
        ▼
  MatchState (derived, in memory)
        │                        └──► MMKV, synchronously, every point
        ▼
  Selectors → TeamZone / HypeTicker    ← Reanimated reacts to score change
        │
        ▼ (on END MATCH)
  outbox.enqueue(matchPayload)
        │
        ▼ (whenever the network is up)
  sync.drain() → supabase.rpc('sync_match', payload)
        │
        ▼
  Postgres  → trigger → Edge Function → Expo Push → FCM → squad members' phones
```

Note what is *not* in that diagram: no network call is on the critical path of a tap. A match played
in airplane mode is indistinguishable from one played on wifi until the moment it ends.

## Environment configuration

`.env` at the repo root, git-ignored, mirrored by a committed `.env.example`:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Only `EXPO_PUBLIC_`-prefixed variables reach the client bundle, and everything in the client bundle
is public. The anon key is designed for this — it is safe *only because* RLS is enforced on every
table. The `service_role` key must never appear outside Edge Function secrets.

## Testing strategy, proportionate to risk

| What | How | Coverage target |
|---|---|---|
| Scoring engine | Jest, pure functions, the matrix in `03` | **100% of branches. Non-negotiable.** |
| Store actions | Jest, drive the store directly | Happy path + undo + end-early |
| Sync/outbox | Jest with a mocked Supabase client | Retry, duplicate submit, offline enqueue |
| Screens | RNTL smoke tests: renders, tap awards a point | One per screen |
| Visual | Manual against the HTML on a real device | — |

A bug in the engine means a friend group argues about a scoreline. That is the failure mode that
matters most in this app; weight the tests accordingly.
