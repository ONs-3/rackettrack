# RacketTrack — session handoff

Written at the end of a build session that took the project from the design handoff bundle
(`docs/design-handoff/`) to a working Android app with phases 0–4 built and verified on a
local emulator. This is the "what happened and what's next" doc — `README.md` is the shorter
ongoing-status version.

## Environment state on this machine

- **Android Studio + SDK** installed via Homebrew (`android-commandlinetools`), not the Android
  Studio GUI wizard — provisioned headlessly with `sdkmanager`.
- **JDK 17** installed separately (`brew install openjdk@17`) and is what `JAVA_HOME` must point at.
  Android Studio's own bundled JBR is JDK 25, which is too new for Gradle/AGP's native (CMake) build
  tooling right now — using it makes every native module's `configureCMakeDebug` task fail with
  `WARNING: A restricted method in java.lang.System has been called`. This is set correctly in
  `~/.zshrc` already; if a new shell doesn't have it, check there.
- **AVD**: `RackettrackTest`, Pixel-ish profile, Android 15 (API 35), arm64. `avdmanager create avd`
  with a `-d` device profile flag failed on this cmdline-tools version (a `devices.xml` lookup bug);
  omitting `-d` and accepting the default hardware profile worked.
- `.env` is filled in with a live Supabase project and a Google OAuth web client ID (see below —
  don't re-paste real values into `.env.example`, it isn't gitignored).

```bash
export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
```

## What's built and verified

**Phase 0–1 — scaffold and scoring engine.** Expo SDK 57 project, TypeScript strict, all starter
files in place. The padel rules engine is untouched from the starter and 100% green: 44 tests
(`npm test`), including the 250-run-per-format property test and new store-level tests (undo, rapid
taps, abandon vs. complete).

**Phase 2 — live scoreboard.** Tap zones, hype ticker, haptics, undo, and the hardware-back confirm
sheet all work, confirmed by actually playing matches on the emulator (scored games, won a game, hit
game-point ticker text, abandoned a match, saw the recap).

**Phase 3 — setup, recap, home, history.** New match, recap (both completed and abandoned states),
home + session ladder, match history with expand-in-place — all reading from a local MMKV archive,
all clicked through on-device.

**Phase 4 — auth, squads, roster.** Built and mostly verified:
- Google Sign-In + email magic link behind one `signIn(provider)`. Google reaches the real Google
  account picker with no `DEVELOPER_ERROR` (package name + debug SHA-1 + web client ID all correctly
  wired). Magic link's request/response/redirect cycle is confirmed working end-to-end against the
  live Supabase project — the one test attempt failed with `otp_expired`, which is Gmail's automatic
  link-prescanning consuming the single-use token before a human clicks it (see "Known gaps" below),
  not a bug in the app.
- Squad create/join/roster screen, invite deep link (`rackettrack://join/<code>`), and the
  signed-out-when-you-tap-an-invite case (hold the code, sign in, resume the join automatically).
- New match uses the active squad automatically once one exists; guest mode (no squad) still works
  exactly as before.
- The outbox resolves player names to real `squad_players.id` rows **at sync time**, not at
  match-start time — creating rows for names the squad hasn't seen yet, and handling the "two people
  add 'Dave' offline at once" unique-constraint race from `06-offline-sync-and-push.md`.
- Supabase project is live: migration run, RLS confirmed enabled (an anon, unauthenticated query
  against `squads` returns `[]`, not an error).

**Not built:** phase 5 (merging remote + local history in the UI beyond what the local archive
already shows) and phase 6 (push notifications, accessibility pass, release signing, real app icon).

## Known gaps to close before calling phase 4 "done"

1. **Nobody has completed a real sign-in yet.** Google reaches the picker but the emulator has no
   Google account on it; email hit the Gmail-prescan issue. Needs either: a physical Android device
   (fastest — plug in, enable USB debugging, run `npx expo run:android`, sign in with whatever Google
   account is already on the phone) or a non-Gmail test address, or fixing the Supabase email template
   to use a manual-confirm landing page instead of an auto-redeeming link.
2. **Squad creation/roster sync is untested against a real signed-in session** — the code path is
   there (`app/squad/index.tsx`, `src/features/squad/`) but only a real sign-in unblocks testing it.
3. **`src/types/database.ts` is hand-written**, not generated — accurate against the migration SQL as
   of when it was written, but regenerate for perfect fidelity once you have Supabase CLI access:
   `npx supabase gen types typescript --project-id eaifvhibxhjehozyxtqd > src/types/database.ts`

## Bugs found and fixed this session (all on-device, not from reading code)

1. Infinite render loop on the live screen — two Zustand selectors built a new object/array every
   call, which Zustand v5's `useSyncExternalStore` can't tolerate. Fixed with `useShallow`.
2. Hardware back did *nothing* on the live screen — `gestureEnabled: false` (meant to block iOS
   swipe) also silently blocks Android's back dispatch from ever reaching `BackHandler`. This is the
   exact "worst bug this app can ship" failure mode the spec calls out. Removed the option.
3. Unhandled promise rejection from `NavigationBar.setStyle` during dev-client reloads.
4. `PillButton` clipped a long label ("Continue with Google") onto an invisible second line.
   `adjustsFontSizeToFit` turned out to be unreliable on this RN/Android/Fabric combo — fixed
   deterministically with a smaller fixed font size instead.
5. The Home avatar/sign-in button rendered half off the right edge of the screen — a sibling text
   view had no width constraint and claimed the full row width. Gave it `flex: 1`.

Full detail on all five, plus the deviations below, is in `README.md`.

## Deviations from the handoff bundle, and why

- **`react-native-mmkv` v4** rewrote its API around Nitro modules (`new MMKV()` → `createMMKV()`,
  `.delete()` → `.remove()`) — the starter code targeted the older API.
- **Static Archivo Expanded font** doesn't exist as a downloadable file anymore (Google Fonts ships
  Archivo as variable-only now) — generated locally with `fonttools` by instantiating the variable
  font at the exact axis values the design calls for.
- **`expo-navigation-bar`** dropped background-color control on this SDK because Android 15+ makes
  edge-to-edge mandatory; only icon-contrast (`setStyle`) remains. Screens paint their own background
  full-bleed instead, which is the current equivalent of what the design doc describes.
- **Guest mode** (score without an account) was built — the handoff's README explicitly flagged this
  as a recommendation requiring sign-off rather than something to build unprompted, and it was
  approved before work started.

## Recommended next steps, in order

1. Get one real sign-in working (physical device is fastest) and confirm a squad can be created,
   joined from a second account, and that RLS actually isolates two squads' data from each other —
   the build plan calls this out as needing deliberate adversarial testing, not just a happy-path
   click-through.
2. Play a full match while signed in with a squad active, end it, and confirm it actually lands in
   Supabase (`select * from matches`) with the right teams/sets/points — this exercises the roster
   name-resolution code that's only been typechecked, not run against a live database yet.
3. Regenerate `src/types/database.ts` via the CLI once you have project access set up locally.
4. Phase 5: surface synced squad-mate matches in history (currently only local-archive matches show).
5. Phase 6: Firebase project + `google-services.json`, the `notify-squad` Edge Function, real app
   icon/splash (current one is Expo's default template branding — flagged in `README.md`), release
   keystore, and the SHA-1 dance again for the EAS upload key and (later) Play App Signing.

## Commands

```bash
npx expo start --dev-client    # dev server (Expo Go will NOT work — native modules)
npx expo run:android           # compile locally and install on a connected device/emulator
npm test                       # Jest — 44 tests, all green
npm run typecheck              # tsc --noEmit — clean
eas build --profile development --platform android
eas build --profile preview --platform android   # shareable APK for testers
```
