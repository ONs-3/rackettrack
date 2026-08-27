# Handoff: RacketTrack — padel score tracker (Android, React Native)

## Overview

RacketTrack is a mobile app for tracking racket-sport match scores during casual friend-group
sessions. One phone acts as the scoreboard: two large tap zones, one per team, and each tap awards
a point. The app runs a real padel rules engine (15/30/40, deuce, golden point, sets, tiebreak),
plays back the drama of the match with a "hype ticker", and stores the finished match in a history
with a point-by-point timeline.

MVP is **padel only**, **Android only**, **one scoring device per match**, and **fully
offline-capable**.

The visual direction to build is the one labelled **2b (Ticker)** in the design file. Everything in
this bundle describes 2b. Other options in the design file (1a, 1b, 1c, 2a) are earlier explorations
— **do not build them**.

---

## About the design files

`Padel Score Tracker.dc.html` in this bundle is a **design reference created in HTML**. It is a
prototype demonstrating intended look, motion, and behaviour. It is **not production code and must
not be ported line-by-line**.

The task is to **recreate design 2b as a native Android app in React Native (Expo)**, using idiomatic
React Native patterns — `StyleSheet`, Reanimated, Expo Router, safe-area insets — rather than
translating CSS. Where the HTML uses a browser affordance that has no RN equivalent (variable-font
width axes, CSS `animation`, `skewY`), this README names the RN substitute.

The design was mocked in an iPhone frame because that is what the prototyping tool offered. **The
target is Android.** The layout is platform-neutral — two stacked tap zones and a strip between them
— but three things need Android treatment, all specified in `04-screens.md`: hardware/gesture back
handling, press ripple, and the system navigation bar.

Open the HTML in a browser and interact with the phone labelled **2b** to feel the timing before
writing code. The scoring flow is live: tap either team zone repeatedly and watch the ticker change
at deuce, golden point, set point, and match point.

## Fidelity

**High fidelity.** Colours, type sizes, radii, spacing, and motion timings in this bundle are final
and exact. Recreate them precisely. Where a value is not specified here, read it off the HTML.

The one intentional deviation: the design file uses the Archivo *variable* font with a `wdth` axis.
React Native cannot animate or set variable-font axes reliably, so ship **static** Archivo Expanded
faces instead — see `05-design-tokens.md`.

---

## Confirmed decisions

These were agreed before this handoff was written. Treat them as fixed; flag rather than change.

| Area | Decision |
|---|---|
| Client | React Native via **Expo managed workflow** + **EAS dev client** (not Expo Go — native modules require it) |
| Target | **Android 8+ (API 26+)**. iOS is out of scope |
| Language | TypeScript, `strict: true` |
| Navigation | Expo Router (file-based) |
| Local state | Zustand (+ persist middleware over MMKV) |
| Server state | TanStack Query |
| Testing | Jest + React Native Testing Library |
| Backend | **Supabase** — Postgres, Auth, Storage, Edge Functions |
| Auth | **Google Sign-In + email magic link** |
| Push | **Firebase Cloud Messaging** — free, in v1 scope |
| Realtime | **Not in v1.** One phone scores; the match syncs to the cloud when it ends |
| Offline | **Full offline-first.** The app is fully usable in airplane mode; sync is a background concern |
| Player model | Named roster now, **claimable accounts later** — roster players are rows, not users |
| Sports | Padel hard-coded in v1, but behind a `RuleSet` interface so a second sport is a config file |
| Scope | Home + ladder, New match, Live scoreboard, Recap, History, Squad invites, Push notifications |

### Two things to know before you start

1. **Nothing in this plan needs a paid developer account.** Android lets you build, install on your
   own device, and hand an APK to a friend for free, with no expiry. The Play Console fee is **$25
   once, ever**, and only to publish. Push notifications are free via Firebase. `08` has the detail.
2. **Auth is currently a hard gate before scoring.** For a group standing on a court, that is
   friction. Recommend adding a "Score without an account" path that creates a local-only match and
   offers to claim it after sign-in. It is ~half a day and it is the difference between the app
   being used mid-session and not. Raise it; do not build it unprompted.

---

## Bundle contents

| File | What it is |
|---|---|
| `00-START-HERE.md` | Environment setup for a developer new to React Native on Android. Read first. |
| `01-architecture.md` | Stack rationale, folder structure, data flow, key libraries with versions |
| `02-backend-supabase.md` | Full Postgres schema, RLS policies, the sync RPC, Edge Functions, push |
| `03-scoring-engine.md` | The padel rules specification and its test matrix |
| `04-screens.md` | Screen-by-screen build spec for design 2b, exact values |
| `05-design-tokens.md` | Colours, type, spacing, radii, motion — the single source of truth |
| `06-offline-sync-and-push.md` | Offline model, outbox, conflict rules, notification copy |
| `07-build-plan.md` | Phased task list, in dependency order, with acceptance criteria |
| `08-android-build-and-release.md` | Signing, keystores, the Google Sign-In SHA-1 trap, Firebase push, release checklist |
| `CLAUDE.md` | Drop at the repo root. Standing instructions for Claude Code in this codebase. |
| `starter/` | Real, runnable starter files — engine, tests, tokens, store, two screens, SQL migration |
| `Padel Score Tracker.dc.html` | The design reference. Open in a browser; look at option 2b. |

---

## The shortest possible summary of the product

A session is four friends at a court. One of them opens RacketTrack, taps **Start match**, enters
four names (pre-filled from their squad roster), and props the phone on the fence or holds it. Every
point, someone taps the winning team's half of the screen. The score updates in padel notation. When
the game, set, or match hangs on the next point, the strip between the two halves lights up and says
so. At the end the app shows a recap and — as soon as there is signal — pushes the result to the
squad, whose ladder reorders and whose phones buzz.

Everything else is in service of that loop. If a feature does not make that loop faster or more fun,
it is not v1.

---

## Files

- `Padel Score Tracker.dc.html` — design reference (build **option 2b** only)
- `starter/**` — starter source files, described in `01-architecture.md`
