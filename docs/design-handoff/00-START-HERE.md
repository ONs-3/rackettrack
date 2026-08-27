# 00 — Start here

Written for a developer who knows JavaScript but has not shipped React Native before. If you have,
skim to "Create the project".

**Good news about the target.** Android removes almost every gate iOS put in front of you: no paid
developer account to build or test, no provisioning profiles expiring every 7 days, no Mac required,
and push notifications are free. The Play Console fee is **$25 once, ever** — and only when you
publish.

## What you need

| Requirement | Why | Notes |
|---|---|---|
| Any OS — macOS, Windows, or Linux | Android tooling is cross-platform | Use whatever you already have |
| **Android Studio** (latest stable) | Provides the Android SDK, emulator, and platform tools | ~8 GB. Install the "Android SDK Platform 35" and "Android SDK Build-Tools" components |
| Node.js LTS (22.x) | Runtime for Expo tooling | Install via `nvm` so you can switch later |
| Watchman | File watching; avoids a class of Metro bugs | `brew install watchman` on macOS; optional elsewhere |
| An Android phone | Haptics and the outdoor legibility test need real hardware | Any Android 8+ device. Enable Developer options → USB debugging |
| Java JDK 17 | Gradle needs it | Android Studio bundles a suitable JDK; point `JAVA_HOME` at it |
| A Google account | Firebase (push) and Google Sign-In | The one you already have is fine |
| ~~Google Play Console ($25 one-off)~~ | **Not needed to build or test.** Only to publish | Buy it when you want to be on the Play Store |

### Environment variables

Add to your shell profile (paths differ slightly by OS — Android Studio shows yours under
Settings → Languages & Frameworks → Android SDK):

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk       # macOS
# export ANDROID_HOME=$HOME/Android/Sdk             # Linux
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
```

Verify with `adb devices` — plug your phone in, accept the debugging prompt, and it should appear.

## Expo Go vs a development build

Expo Go is the pre-built sandbox app from the Play Store. It is the fastest way to start, but it only
contains the native modules Expo chose to bundle. **RacketTrack needs modules Expo Go does not
have** — MMKV, Google Sign-In, and Firebase messaging.

So you will use a **development build**: your own app, built once with your native modules baked in.
After that first build, development feels identical to Expo Go — save a file, the app reloads. You
rebuild only when you add or remove a native module.

```bash
npm install -g eas-cli
eas login
eas build --profile development --platform android
```

That produces an **APK you download and install directly** — no store, no signing ceremony, no
expiry. Drag it onto your phone, tap it, done. This is the single biggest day-to-day improvement over
the iOS path.

Prefer to build on your own machine and skip the cloud queue:

```bash
eas build --profile development --platform android --local
```

Or run straight onto a connected device with `npx expo run:android`, which compiles locally and
installs in one step. Slower the first time, fastest thereafter.

Configure `eas.json` so the development profile produces an installable APK rather than an AAB:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

`preview` is how you get the app to a friend to test: build, share the link, they install the APK.
No store account involved.

## Create the project

```bash
npx create-expo-app@latest rackettrack --template default
cd rackettrack
npx expo install expo-router expo-font expo-haptics expo-keep-awake expo-crypto \
  expo-secure-store expo-notifications expo-device expo-auth-session expo-web-browser \
  expo-navigation-bar
npm install zustand @tanstack/react-query react-native-mmkv \
  @supabase/supabase-js react-native-reanimated react-native-safe-area-context \
  react-native-url-polyfill @react-native-google-signin/google-signin
npm install -D typescript jest jest-expo @testing-library/react-native @types/jest
```

Then copy the contents of this bundle's `starter/` folder over the generated project, keeping the
paths. `07-build-plan.md` tells you what to do next, in order.

## The four commands you will use constantly

```bash
npx expo start --dev-client    # bundler; open the dev build on your phone
npx expo run:android           # compile locally and install on a connected device
npm test                       # Jest
npx tsc --noEmit               # typecheck
```

## Things that will confuse you early, pre-empted

- **"Unable to resolve module …"** — you added a dependency and did not restart Metro. Kill it, run
  `npx expo start --dev-client --clear`.
- **Reanimated needs a Babel plugin.** `babel.config.js` must list `'react-native-reanimated/plugin'`
  **last** in `plugins`. Symptom if you forget: animations silently do nothing.
- **Styles are not CSS.** No cascade, no inheritance except text inside `<Text>`. There are no units;
  numbers are density-independent pixels. `gap` works and you should use it.
- **All text must be inside a `<Text>` component.** A bare string in a `<View>` throws.
- **`flex: 1` is your `height: 100%`.** The two team zones are `flex: 1` siblings.
- **Gradle's first build is slow** — 5–10 minutes is normal. Later builds are incremental and fast.
- **The emulator is fine for layout, useless for haptics.** Vibration does not emulate. Test the
  scoring feel on a real device before judging it.
- **Android device diversity is real.** Test on the smallest screen you can find (a 5.5" budget phone)
  and something large. The `flex: 1` layout handles it, but check the score numeral still fits.
- **Hardware/gesture back is a real navigation event.** iOS does not have this. On the live match
  screen you must intercept it — see `04-screens.md`. Losing a match to an accidental back swipe is
  the worst bug this app could have.

## Getting a Supabase project

1. Create a free account at supabase.com, create a project, pick the region closest to your users.
2. Copy the project URL and the **anon** key into `.env` (see `01-architecture.md`). Never put the
   `service_role` key in the app.
3. Run the migration in `starter/supabase/migrations/0001_init.sql` from the SQL editor.

**Free tier caveat you must design around:** a free Supabase project **pauses after ~7 days of
inactivity** and needs a manual unpause from the dashboard. This is survivable precisely because the
app is offline-first — a paused backend means sync waits, not that the app breaks. Do not let any
screen block on a network call.
