# 07 — Build plan

Seven phases, in dependency order. Each is independently demoable and has an acceptance test. Do not
start a phase before its predecessor's criteria are green — particularly phase 1, which everything
else assumes is correct.

Estimates assume one developer new to React Native, including the learning curve.

**Nothing here needs a paid developer account.** Android lets you build, install, and share test
builds for free — push included. Read `08-android-build-and-release.md` before phase 0 and again
before phase 4 (the Google Sign-In SHA-1 setup is the one genuinely fiddly step in the project).

---

## Phase 0 — Environment and skeleton (½–1 day)

- Work through `00-START-HERE.md`. Android Studio, SDK, `ANDROID_HOME`, `adb devices` seeing your phone.
- `npx create-expo-app`, install dependencies, copy `starter/` over the generated tree.
- Configure `babel.config.js` for Reanimated (plugin **last**), `tsconfig.json` for the `@/*` alias.
- Set `android.package` in `app.json`. **Choose carefully — it is permanent.**
- Configure `eas.json` so development and preview profiles emit APKs (snippet in `00`).
- Load fonts: `@expo-google-fonts/archivo` plus the static Archivo Expanded TTF in `assets/fonts/`.
- Build and install the dev client on a real device.

**Done when:** the dev client runs on your phone, a screen renders "RacketTrack" in Archivo Expanded,
and a Reanimated fade works.

**Done when:** the dev client runs on your phone, a screen renders "RacketTrack" in Archivo Expanded,
and a Reanimated fade works.

---

## Phase 1 — Scoring engine (1–2 days) · *the highest-value work in the project*

- Copy `starter/src/features/scoring/` in as-is.
- Run `npm test`. All of `03-scoring-engine.md`'s matrix must pass.
- Read the engine until you can explain why `replay` exists and why nothing mutates. You will be
  living in this file.
- Add any padel edge case you know of that is not covered.

**Done when:** `npm test` is green, branch coverage on `engine.ts` is 100%, and the property test
runs 250 random matches per format without a violation.

**Do not proceed with a failing test here.** A UI bug looks bad; a scoring bug ends the friendship
the app exists to serve.

---

## Phase 2 — Live scoreboard, local only (2–3 days)

No backend, no auth, no navigation beyond one screen. Hardcode four names.

- `theme/tokens.ts`, `TeamZone`, `HypeTicker`, `app/match/live.tsx` (all in `starter/`).
- Wire `matchStore` with MMKV persistence.
- Haptics, `useKeepAwake`, the `pop` / `snap` / `flash` animations.
- **Intercept hardware/gesture back** so it cannot silently discard a live match (see `04-screens.md`).
- Verify the score numeral does not jitter as digits change — Android needs the `tabular-nums`
  fallback check in `05-design-tokens.md`.

**Done when:** you can play a full best-of-3 on a real device, on a court if possible; the score is
legible from three metres; the ticker fires exactly at golden point, set point, and match point;
undo works from any state; back does not lose the match; force-quitting mid-match and reopening
restores the exact score.

Do this phase's device test outdoors in daylight before moving on. Also run it once on the smallest
Android screen you can borrow — Android's device spread is much wider than iOS's and the numeral is
the first thing to break. Both are far cheaper to fix now.

---

## Phase 3 — Match setup, recap, and local history (2–3 days)

- Expo Router: tabs (`Home`, `History`) plus the `match/` stack.
- `match/new.tsx`, `match/[id].tsx`, `(tabs)/history.tsx`, `(tabs)/index.tsx`.
- Local match archive in MMKV; history reads from it.
- Abandoned-match handling end to end: `NO RESULT`, asterisked scoreline, no MVP.

**Done when:** the full loop — start, score, end, recap, find it in history — works with the device
in airplane mode for the entire session, and the hardware back button behaves sensibly on every
screen.

---

## Phase 4 — Supabase and auth (2–3 days)

- Create the project, run `0001_init.sql`, generate `src/types/database.ts`.
- **Google Sign-In, then email magic link**, both behind one `signIn(provider)` function.
- Register the debug **and** EAS upload keystore SHA-1 fingerprints in Google Cloud. Budget real time
  for this — it is the fiddliest step in the project and `08` exists because of it.
- Squad creation, roster, invite codes, `join_squad` deep link.
- Verify RLS by hand: sign in as a second user and confirm you cannot read the first user's squad.

**Done when:** two accounts can join one squad and see each other's rosters; a direct query for
another squad's matches returns zero rows; and Google Sign-In works in **both** a local debug build
and an EAS preview APK.

Test RLS deliberately and adversarially. It is the entire authorisation layer; a permissive policy
is a data breach, not a bug.

---

## Phase 5 — Sync (1–2 days)

- `outbox.ts`, `sync_match` RPC, drain on foreground and network regain.
- History merges local and remote, deduplicating on `client_id`.
- The unsynced dot on history rows.

**Done when:** a match played in airplane mode appears in the other squad member's app within
seconds of the scorer regaining signal, and syncing the same match twice creates exactly one row.

---

## Phase 6 — Push and polish (2–3 days)

All of this is free on Android.

- Firebase project, `google-services.json`, FCM V1 service account uploaded to Expo (`08`).
- `notify-squad` Edge Function, the `matches` trigger, `push_tokens`.
- The `results` notification channel — without it Android 8+ gives you a silent default.
- Runtime permission prompt (Android 13+) after the first completed match, not before.
- 15-minute per-squad rate limit with aggregation.
- Accessibility pass: labels on tap zones, score announcements, reduced-motion handling.
- Adaptive icon (foreground + background layers), splash, permission trim.
- Release build with R8 enabled — **test it**, minification breaks things debug builds never show.
- Preview APK sent to a friend who is not you.

**Done when:** finishing a match on device A buzzes device B with correct copy, the deep link opens
the recap, and someone else has installed your APK and played a match on it.

---

## Deliberately out of scope for v1

Named here so they do not creep in. Each is a real idea; none is v1.

- Live spectating from a second phone (needs Supabase Realtime — a phase 7)
- Badminton and tennis rulesets (the `RuleSet` interface is ready; ship padel first)
- Per-player serve tracking and court sides
- Photos, videos, court booking, ELO ratings
- **iOS** — the engine, store, and backend are all platform-agnostic, so it is a design review and a
  signing exercise rather than a rewrite. Do not carry iOS considerations while building
- Tablets and foldables (phone layouts only; `flex: 1` will not embarrass you, but it is untested)
- Web dashboard

---

## Where the risk actually is

| Risk | Likelihood | What to do about it |
|---|---|---|
| Google Sign-In SHA-1 / client-ID confusion | **High** | The fiddliest step in the project. Register debug, EAS upload, and (later) Play App Signing fingerprints. `webClientId` in code is the **web** ID |
| Scoring edge cases found after launch | Low if phase 1 is honoured | The property test; do not skip it |
| Free-tier Supabase pausing looks like a broken app | High | Phase 3's airplane-mode criterion is the mitigation |
| Android device fragmentation — layout breaks on small screens | Medium | Phase 2's small-device test. `flex: 1` handles most of it; the numeral is what breaks |
| OEM battery optimisation killing background work | Medium | Already mitigated: nothing runs in the background by design. Do not add a background sync task |
| Reanimated learning curve | Medium | Three animations total, all in `starter/`. Copy first, understand second |
| Numerals unreadable in sunlight | Medium | Phase 2's outdoor test. Cheap to fix then, expensive later |
| R8 minification breaking the release build | Low | Build and run a release APK once in phase 6, not on release day |
| Scope creep into live spectating | High | It is genuinely the best v2 feature. Write it down and ship v1 |
