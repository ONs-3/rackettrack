# 08 — Android build, signing, and release

Everything here is free until the last section.

## What Android does not make you do

Worth stating plainly, because it shapes the plan:

| | iOS | Android |
|---|---|---|
| Account to build | Free Apple ID | None |
| Account to test on your own device | Free, **profile expires every 7 days** | None, no expiry |
| Account to send a build to a friend | Paid ($99/yr) for TestFlight | None — send them an APK |
| Account to publish | Paid ($99/yr, recurring) | **$25 once, ever** |
| Push notifications | Paid membership required | Free via Firebase |
| Dev machine | Mac only | Any OS |

The consequence for the build plan: **every phase, including push, is reachable for free.** There is
no deferred work and no gated phase. See `07-build-plan.md`.

## Signing, in the amount of detail you need

Android apps are signed with a **keystore**. There are two you will care about:

**1. The debug keystore.** Auto-generated, lives at `~/.android/debug.keystore`, used for local
builds. Its SHA-1 fingerprint must be registered with Google Cloud for Google Sign-In to work in
development:

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey \
  -storepass android -keypass android
```

**2. The upload keystore.** Your real app's identity, forever. Lose it and you cannot update your own
app. Let EAS generate and store it:

```bash
eas credentials
```

EAS keeps it encrypted on their servers and you can download a backup — do that, and put it somewhere
you will still have in three years. To see the fingerprint EAS is using:

```bash
eas credentials -p android      # choose "Keystore: Manage everything" → shows SHA-1 / SHA-256
```

### The Google Sign-In gotcha that costs everyone an afternoon

Google Sign-In authenticates against a client ID bound to **your package name plus a SHA-1
fingerprint**. Because you have two keystores, you have two fingerprints, and **both must be
registered** or sign-in works in development and fails in your release build (or vice versa).

In the Google Cloud console, create OAuth client IDs:

- **Android client** for the debug SHA-1 + `com.yourname.rackettrack`
- **Android client** for the EAS upload SHA-1 + the same package name
- **Web client** — this is the one that goes into Supabase's Google provider config, *and* into
  `GoogleSignin.configure({ webClientId })` in the app

That last line is the part people get wrong: the *web* client ID goes in the app code, not the
Android one. The Android client IDs are never referenced in your source; they exist so Google can
verify the signature. Getting it backwards produces a bare `DEVELOPER_ERROR` with no other
diagnostic.

If you later publish with **Play App Signing** (the default, and recommended), Google re-signs your
app with a third key. Add *that* SHA-1 too — Play Console shows it under Setup → App signing. Sign-in
breaking only in the Play Store build, having worked everywhere else, is always this.

## Push notifications via Firebase

Free, no membership. Setup:

1. Create a Firebase project, add an **Android app** with your exact package name.
2. Download `google-services.json` into the project root.
3. Reference it in `app.json`:

```json
{
  "expo": {
    "android": {
      "package": "com.yourname.rackettrack",
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

4. Rebuild the dev client — this is a native config change, so a JS reload will not pick it up.
5. In Expo's dashboard, upload the **FCM V1 service account JSON** (Firebase → Project settings →
   Service accounts → Generate new private key) so Expo's push service can deliver on your behalf.

After that, `expo-notifications` works exactly as documented and the `notify-squad` Edge Function in
`02-backend-supabase.md` needs no changes.

**Android 13+ requires runtime notification permission.** Request it after the user's first completed
match, never on first launch — `06-offline-sync-and-push.md` explains why.

## Getting the app to testers

Three options, in increasing formality:

1. **Send an APK.** `eas build -p android --profile preview` gives you a URL. They tap it, allow
   "install unknown apps" once, done. No account, no review, no wait. Use this for your friend group.
2. **Internal testing track** on Play Console (needs the $25). Up to 100 testers, no review delay,
   installs through the Play Store like a normal app.
3. **Production.** Public listing, review (a few days), a store page you have to write.

For a friend-group app, option 1 covers you for a long time. Option 2 is worth it when you are tired
of explaining "allow unknown apps" to people.

## Release checklist, when you get there

- `app.json`: `android.package` set and **never changed again** (it is your app's permanent identity),
  `versionCode` incremented every upload, `version` for humans.
- Adaptive icon: foreground + background layers, not a single square PNG. Android masks it to
  whatever shape the launcher wants.
- `android.permissions` — trim it. Expo adds a broad default set; declare only what you use. Extra
  permissions hurt install conversion and invite review questions.
- ProGuard/R8 minification on for release. Test the release build before uploading — minification
  occasionally breaks reflection-based libraries in ways debug builds never show.
- Test on Android 8 (minimum) and the current version. `expo-notifications`, edge-to-edge layout, and
  permission flows all differ across that range.
- Play Console requires a privacy policy URL and a Data Safety declaration. You collect: email or
  Google account identifier, display names, and match data. Declare all three honestly; a false
  declaration is the most common cause of rejection.

## What is now genuinely out of scope

iOS. The architecture does not prevent it — the scoring engine, store, Supabase layer, and all the
business logic are platform-agnostic, and only the nav-bar conventions and haptic mapping in
`04-screens.md` are Android-specific. If you ever want iOS, it is a design review and a signing
exercise, not a rewrite. But do not carry iOS considerations while building; they cost attention and
buy nothing today.
