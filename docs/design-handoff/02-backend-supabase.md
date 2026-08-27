# 02 — Backend: Supabase

Postgres, Auth, and Edge Functions. **No custom server in v1.** The client talks to Postgres directly
through PostgREST, and row-level security is the entire authorisation layer.

`starter/supabase/migrations/0001_init.sql` is the complete, runnable migration. This document
explains the shape and the reasoning; read both.

## Data model

```
auth.users
    │ 1:1
profiles ──────┐
    │          │ owner
    │ member   ▼
    └──► squads ──► squad_players ──► matches ──► match_sets
                         (roster)         │
                                          └────► match_points
```

### Design decisions worth defending

**Roster players are rows, not users.** `squad_players` holds a display name and an *optional*
`claimed_by` pointing at a profile. You can score a match against "Rob" who has never opened the app;
if Rob later joins the squad and claims that roster entry, every historical match retroactively
becomes his. This is what "named roster now, claimable accounts later" means, and it is the single
most important schema decision here — it lets the app be useful on day one with one installed copy.

**Points are rows, not JSON.** `match_points` is one row per point. It costs ~60 rows per match, and
on the free tier's 500 MB you would need roughly 40,000 matches before it mattered. In exchange you
get SQL-queryable momentum, streaks, and comeback stats later without a migration.

**Sets are denormalised anyway.** `match_sets` stores the set-by-set result even though it could be
derived from `match_points`. History screens read it constantly and should never replay a timeline
server-side.

**`client_id` on every synced row.** The device generates a UUID before the match starts. Sync is an
upsert keyed on `client_id`, which makes retries idempotent — the outbox can submit the same match
five times over a flaky connection with no duplicates.

## Tables

| Table | Purpose | Key columns |
|---|---|---|
| `profiles` | One per auth user | `id` (= `auth.uid()`), `display_name`, `avatar_url` |
| `squads` | A friend group | `id`, `name`, `owner_id`, `invite_code` (8 chars, unique) |
| `squad_members` | Who belongs, and their role | `(squad_id, profile_id)`, `role` in `owner`/`member` |
| `squad_players` | The roster — names, claimable | `id`, `squad_id`, `display_name`, `claimed_by` |
| `matches` | One per match | `id`, `client_id`, `squad_id`, `created_by`, `sport`, `format` (jsonb), `court`, `started_at`, `ended_at`, `status`, `winner_team` |
| `match_teams` | Two rows per match | `(match_id, team_index)`, `label` |
| `match_team_players` | Which roster players on which team | `(match_id, team_index, player_id)` |
| `match_sets` | Set-by-set result | `(match_id, set_index)`, `games_a`, `games_b`, `tiebreak` |
| `match_points` | The timeline | `(match_id, seq)`, `winning_team` |
| `push_tokens` | Expo push tokens per device | `profile_id`, `token`, `platform` |

`matches.status` is one of `live`, `complete`, `abandoned`. A match ended early by the user is
`abandoned` with `winner_team` null — the app must never invent a winner for one.

## Row-level security

RLS is on for every table. The rule, in one sentence: **you can read anything belonging to a squad
you are a member of, and you can write only what you created.**

Two traps that will cost you an afternoon if you hit them cold:

1. **Recursive policies.** A policy on `squad_members` that queries `squad_members` will recurse and
   error. The migration solves this with a `security definer` helper function `is_squad_member(uuid)`
   that bypasses RLS for that one lookup. Use it everywhere; do not inline the subquery.
2. **Policies are permissive by default and combine with OR.** Two policies on the same table for the
   same action widen access rather than narrowing it. Write one policy per (table, action).

## The sync RPC

A match is many rows across five tables and must land atomically — a half-synced match would show a
scoreline with no points behind it. One Postgres function handles it:

```sql
select sync_match(payload jsonb) -- returns the server match id
```

The payload is the whole match: format, court, timestamps, teams, players, sets, and the point
timeline as an int array. The function upserts on `client_id`, replaces child rows, and returns the
id. It is `security invoker`, so RLS still applies — a user cannot sync a match into someone else's
squad.

Calling it twice with the same payload is a no-op. Calling it with an extended timeline (the user
reconnected mid-match in some future version) replaces the points cleanly.

## Edge Function: `notify-squad`

Triggered by a Postgres trigger on `matches` when `status` transitions to `complete`. It:

1. Reads the squad's members, excluding the scorer.
2. Loads their `push_tokens`.
3. Posts to `https://exp.host/--/api/v2/push/send`.

Notification copy — keep it in the register the app uses everywhere else:

> **Rob & Sinéad went down 6-4 3-6 7-5**
> Cian & Aoife take it in the decider. Tap for the recap.

Deep link to `rackettrack://match/<id>`.

The function needs `SUPABASE_SERVICE_ROLE_KEY` as a secret — it is the one place that key is legitimate.
Set it with `supabase secrets set`, never in the repo.

## Generated types

After every migration:

```bash
npx supabase gen types typescript --project-id <id> > src/types/database.ts
```

Commit the output. It is what makes `supabase.from('matches')` type-safe, and a stale copy is a
silent source of runtime bugs.

## Free-tier limits to design against

| Limit | Value | Consequence for RacketTrack |
|---|---|---|
| Database | 500 MB | Not a constraint at this data volume |
| Auth users | 50,000 MAU | Not a constraint |
| Edge Function invocations | 500k/month | Not a constraint |
| **Project pausing** | **after ~7 days of no activity** | **The real one.** Unpause is manual from the dashboard |
| Egress | 5 GB/month | Not a constraint without images |

The pausing behaviour is why offline-first is not a nice-to-have here. Every read must fall back to
the local cache and every write must go through the outbox. If a user opens the app on a paused
project, they should see their full local history and be able to score a whole match without ever
learning the backend was asleep.

If the app gets real usage, a cron ping every few days from a free scheduler keeps it warm; that is a
workaround, not an architecture. Budget for the paid tier at launch.
