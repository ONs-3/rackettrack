# RacketTrack — instructions for Claude Code

Padel score tracker. React Native (Expo) for **Android**, Supabase backend, TypeScript strict
throughout. The design spec lives in `docs/handoff/`; read `README.md` there before making visual
changes. iOS is explicitly out of scope — do not add platform branches for it.

## Non-negotiables

**The scoring engine is pure and immutable.** `src/features/scoring/` has no React, no async, no
dependencies. Match state is *derived* from `timeline: TeamIndex[]` by `replay()`. Never add a
mutable score field, never mutate state in place, never make the engine async. Undo, sync, and every
test depend on this property.

**Never change the engine without running its tests.** `npm test -- engine` must be green before and
after. If a change requires editing an existing test's expectation, stop and ask — it means the rules
changed, which is a product decision.

**Team A is lime `#D6FF4B`. Team B is orange `#FF6B3D`.** On every screen, without exception. This is
how a user reads the score from across a court.

**Import colours, sizes, and type from `src/theme/tokens.ts`.** A hex literal or a magic font size in
a component is a bug. If a value is missing from tokens, add it there first.

**No network call on the critical path of a user action.** Reads come from the TanStack Query cache;
writes go through `src/lib/outbox.ts`. The app must work fully in airplane mode. If you find yourself
writing `await supabase…` inside a press handler, you are on the wrong path.

**Hardware back is never a silent destructive action.** On the live match screen it opens a confirm
sheet. Losing a match in progress to a back swipe is the worst bug this app can have.

## Conventions

- `app/` holds routes only — read a store or hook, compose components, navigate. No business logic.
- Business logic lives in `src/features/<domain>/`. Shared UI in `src/components/`.
- Path alias is `@/` → `src/`.
- Styles use `StyleSheet.create` with token imports. No inline style objects except animated ones.
- Animations use Reanimated 3 only. `Animated` from `react-native` runs on the JS thread and drops
  frames during scoring.
- Every numeric display sets `fontVariant: ['tabular-nums']` — and if Android ignores it for a given
  font, use the fixed-width digit cells in `05-design-tokens.md`.
- Ripple (`android_ripple`) on list rows and buttons; **opacity only** on the two team zones.
- One solid button per screen, at the bottom. Secondary actions are nav-bar text.
- Bottom spacing is `insets.bottom + 36`, never a bare 36 — three-button navigation devices need both.
- After a schema change: `npx supabase gen types typescript --project-id <id> > src/types/database.ts`
  and commit the result.

## Commands

```bash
npx expo start --dev-client    # dev server (Expo Go will NOT work — native modules)
npx expo run:android           # compile locally and install on a connected device
npm test                       # Jest
npx tsc --noEmit               # typecheck
eas build --profile development --platform android
eas build --profile preview --platform android   # shareable APK for testers
```

## Things that are deliberate, not oversights

- **MMKV instead of SQLite.** Data volume is tiny. Revisit only above ~5 MB of local archive.
- **No realtime in v1.** One phone scores; the match syncs when it ends. Live spectating is v2.
- **Auth is Google Sign-In + email magic link.** All providers go through one `signIn(provider)`
  function — keep it that way. `webClientId` is the **web** OAuth client ID, not the Android one.
- **Push is in scope** — free via Firebase Cloud Messaging. Needs the `results` notification channel
  and an Android 13+ runtime permission request, made after the first completed match.
- **Nothing runs in the background.** Sync drains on foreground only. OEM battery optimisation makes
  background work unreliable on exactly the devices we cannot test — do not add a background task.
- **`android.package` is permanent.** Never change it.
- **Points stored as one row each.** ~60 rows a match buys SQL-queryable momentum stats later.
- **Roster players are rows, not users.** `squad_players.claimed_by` is how they become accounts
  later. Never write a raw name string into a match.
- **Abandoned matches have no winner.** The DB constraint enforces it. Do not let the UI invent one.
- **Sport chips for badminton and tennis are non-functional.** Padel is hard-coded in v1 behind the
  `RuleSet` interface.

## Before you finish any task

1. `npx tsc --noEmit` clean.
2. `npm test` green.
3. If you touched the live screen, describe how you verified rapid taps do not drop points, and that
   hardware back still prompts rather than discards.
4. If you touched anything visual, name the tokens you used.
