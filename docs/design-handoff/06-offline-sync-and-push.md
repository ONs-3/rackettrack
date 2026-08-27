# 06 — Offline, sync, and push

## The rule

**No network call is ever on the critical path of a user action.**

A user standing on a court with no signal must be able to open the app, see their squad, their
roster, and their full history, start a match, score all of it, end it, and read the recap. The only
thing they cannot do offline is see a *teammate's* match that was played on another phone.

This is not defensive engineering for its own sake. Padel courts are frequently in metal-framed
buildings or basements, and the Supabase free tier pauses after ~7 days of inactivity. Both failure
modes look identical to the app, and both must be invisible.

Android adds a third: aggressive battery optimisation on many OEM builds (Xiaomi, Huawei, Samsung's
stricter modes) can kill background work outright. Since nothing in RacketTrack depends on background
execution — sync drains on foreground, not on a schedule — this costs you nothing. **Do not add a
background sync task.** It will be unreliable on exactly the devices you cannot test.

## Reads

Every read goes through TanStack Query with a persisted cache backed by MMKV:

```ts
persistQueryClient({
  queryClient,
  persister: createSyncStoragePersister({ storage: mmkvPersister }),
  maxAge: Infinity,          // stale data beats no data on a court
});
```

Set `staleTime` generously — history and squads change slowly. Show cached data immediately and
revalidate in the background. **Never render a spinner over content you already have.**

The live match is not a query at all. It is Zustand state persisted synchronously to MMKV on every
point, so a crash or a force-quit mid-match loses nothing.

## Writes: the outbox

All writes are queued, never awaited by the UI. `starter/src/lib/outbox.ts` implements this.

```
end match → enqueueMatch()          synchronous, MMKV
                 │
                 ▼
          drainOutbox()             fire and forget
                 │
      ┌──────────┴──────────┐
   success                failure
      │                       │
   remove              keep, increment attempts
```

Drain on: app foreground, network regained (`expo-network` / `NetInfo`), and immediately after a
match ends.

### Idempotency

Every match carries a `client_id` UUID generated **before the first point**. `sync_match` upserts on
it. A flaky connection can submit the same match five times with no duplicates, which means the
outbox never needs to reason about whether a previous attempt half-succeeded.

### Failures that should stop retrying

Most errors are transient and stay queued. Two are permanent and must be dropped, or the outbox
grows forever:

| Postgres code | Meaning | Action |
|---|---|---|
| `42501` | RLS denied — user left the squad | Drop the entry |
| `23503` | Foreign key violation — squad or player deleted | Drop the entry |
| anything else | Transient | Keep, retry later |

Surface `pendingCount()` as a small unsynced dot on history rows. Do not build a sync-status screen;
nobody wants one.

### Conflicts

There are none in v1, by construction. One device owns a match for its entire life, and matches are
append-only. Do not build merge logic for a problem the architecture already prevents.

The one race worth knowing: two squad members both add a roster player named "Dave" while offline.
The `unique (squad_id, display_name)` constraint means the second sync fails with `23505`. Handle it
by re-reading the roster and remapping to the existing player id — a short, contained special case.

## Auth

**Google Sign-In and email magic link.** Both free, both native on Android.

Put every provider behind one function so a third is a new case, not a refactor:

```ts
type Provider = 'google' | 'email';

GoogleSignin.configure({
  // The WEB client ID, not the Android one. This trips up everybody — see 08.
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

async function signIn(provider: Provider, email?: string) {
  if (provider === 'google') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const { data } = await GoogleSignin.signIn();
    return supabase.auth.signInWithIdToken({ provider: 'google', token: data!.idToken! });
  }
  return supabase.auth.signInWithOtp({
    email: email!,
    options: { emailRedirectTo: 'rackettrack://auth/callback' },
  });
}
```

Things that catch people out:

1. **`webClientId` really is the web client ID.** The Android OAuth client IDs are never referenced in
   source — they exist so Google can verify your app's signature. Backwards gives you a bare
   `DEVELOPER_ERROR`.
2. **Every signing keystore needs its SHA-1 registered.** Debug, EAS upload, and Play App Signing are
   three different keys. Sign-in that works locally and fails in the store build is always this.
   `08-android-build-and-release.md` has the commands.
3. **`hasPlayServices()` is not optional on Android.** Some devices genuinely lack or have outdated
   Play Services, and the failure is otherwise silent.
4. **Magic links need the deep link registered.** Set `scheme: "rackettrack"` in `app.json` and add
   the redirect URL to Supabase's allow-list, or the email link opens Chrome and dead-ends.
5. **Supabase's built-in email sender is rate-limited** on the free tier — a few per hour from a
   shared address. Fine for you and testers; plug in a free Resend or Postmark SMTP key before real
   users.
6. Sessions persist in MMKV synchronously (see `starter/src/lib/supabase.ts`) so the app knows
   whether it is signed in before the first frame — no auth flicker on cold start.

### Guest mode — the recommendation from the README

Auth is currently a hard gate before scoring. Standing on a court, that is the wrong moment to ask
someone to authenticate. The cheap fix, if the product owner agrees:

- Score into local-only state with `squadId: null`.
- Keep the match in the outbox, unsent.
- After sign-in, prompt: "Add your 3 offline matches to Rally Club?" and drain.

The outbox and the `client_id` scheme already support this. It is roughly half a day. Do not build it
without agreement, but do ask.

## Push notifications

**Free on Android via Firebase Cloud Messaging, and in v1 scope.** Setup is in
`08-android-build-and-release.md`.

Two notifications in v1. Both are about other people's results — the app should never notify you
about something you did.

| Trigger | Copy |
|---|---|
| A squad member finishes a match you were in | **Rob & Sinéad went down 6-4 3-6 7-5** · Cian & Aoife take it in the decider. Tap for the recap. |
| A squad member finishes a match you were not in | **Court 3 results are in** · Cian & Aoife beat Dave & Niamh 6-2 6-3. |

Deep link both to `rackettrack://match/<id>`.

### Wiring

1. `expo-notifications` requests permission — **after** the user's first completed match, never on
   first launch. Asking before you have earned it is how you get a permanent denial. On **Android 13+
   (API 33) this is a runtime permission** and a denial is sticky; on older versions it is granted at
   install. Handle both.
2. Store the Expo push token in `push_tokens`. Requires `google-services.json` in the build and the
   FCM V1 service account uploaded to Expo — see `08`.
3. A Postgres trigger on `matches` fires when `status` becomes `complete` and calls the
   `notify-squad` Edge Function via `pg_net`.
4. The function loads squad members' tokens, excludes the scorer, and posts to
   `https://exp.host/--/api/v2/push/send`.

Expo's push service handles FCM credentials for you once the service account is uploaded, which is
the main reason to stay in the Expo ecosystem for v1.

Set an Android notification channel explicitly — without one, Android 8+ assigns a default with no
sound and users will report notifications as "not working":

```ts
await Notifications.setNotificationChannelAsync('results', {
  name: 'Match results',
  importance: Notifications.AndroidImportance.DEFAULT,
  vibrationPattern: [0, 250, 250, 250],
  lightColor: '#D6FF4B',
});
```

### Rate limiting

A four-player session might finish six matches in ninety minutes. Six buzzes is spam. Collapse
notifications per squad to at most one every 15 minutes, and after the first, aggregate:
**"3 more results from tonight's session"**.
