-- RacketTrack — initial schema
-- Run in the Supabase SQL editor, or: supabase db push
--
-- Conventions:
--   * every table has RLS enabled with exactly one policy per (table, action)
--   * squad membership lookups go through is_squad_member() to avoid recursive policies
--   * synced rows carry client_id so the device outbox can retry safely

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 40),
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- Create a profile automatically on sign-up. Apple hides the name on repeat
-- sign-ins, so fall back to a generic label the user can edit later.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      'Player'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- squads
-- ---------------------------------------------------------------------------

create table squads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) between 1 and 40),
  owner_id    uuid not null references profiles(id) on delete cascade,
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  created_at  timestamptz not null default now()
);

create table squad_members (
  squad_id   uuid not null references squads(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role       text not null default 'member' check (role in ('owner', 'member')),
  joined_at  timestamptz not null default now(),
  primary key (squad_id, profile_id)
);

-- The roster. A player is a NAME, optionally claimed by a real account later.
-- This is what lets a squad track matches against friends who never install the app.
create table squad_players (
  id           uuid primary key default gen_random_uuid(),
  squad_id     uuid not null references squads(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 40),
  claimed_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (squad_id, display_name)
);

create index on squad_members (profile_id);
create index on squad_players (squad_id);

-- security definer breaks the policy recursion: a policy ON squad_members
-- cannot itself SELECT from squad_members under RLS.
create function is_squad_member(target_squad uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from squad_members
    where squad_id = target_squad and profile_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- matches
-- ---------------------------------------------------------------------------

create table matches (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null unique,          -- generated on device before the match starts
  squad_id    uuid not null references squads(id) on delete cascade,
  created_by  uuid not null references profiles(id) on delete cascade,
  sport       text not null default 'padel',
  format      jsonb not null,                -- MatchFormat, verbatim from the client
  court       text,
  started_at  timestamptz not null,
  ended_at    timestamptz,
  status      text not null default 'complete' check (status in ('live', 'complete', 'abandoned')),
  winner_team smallint check (winner_team in (0, 1)),
  synced_at   timestamptz not null default now(),
  -- An abandoned match has no winner. Never let the app invent one.
  constraint winner_only_when_complete
    check ((status = 'complete') = (winner_team is not null))
);

create table match_teams (
  match_id   uuid not null references matches(id) on delete cascade,
  team_index smallint not null check (team_index in (0, 1)),
  label      text,
  primary key (match_id, team_index)
);

create table match_team_players (
  match_id   uuid not null references matches(id) on delete cascade,
  team_index smallint not null check (team_index in (0, 1)),
  player_id  uuid not null references squad_players(id) on delete cascade,
  position   smallint not null default 0,
  primary key (match_id, team_index, player_id)
);

create table match_sets (
  match_id  uuid not null references matches(id) on delete cascade,
  set_index smallint not null,
  games_a   smallint not null,
  games_b   smallint not null,
  tiebreak  boolean not null default false,
  primary key (match_id, set_index)
);

-- One row per point. ~60 rows a match; cheap, and it makes momentum stats a query
-- rather than a migration.
create table match_points (
  match_id     uuid not null references matches(id) on delete cascade,
  seq          integer not null,
  winning_team smallint not null check (winning_team in (0, 1)),
  primary key (match_id, seq)
);

create index on matches (squad_id, ended_at desc);
create index on matches (created_by);
create index on match_team_players (player_id);

-- ---------------------------------------------------------------------------
-- push tokens
-- ---------------------------------------------------------------------------

create table push_tokens (
  profile_id uuid not null references profiles(id) on delete cascade,
  token      text not null,
  platform   text not null default 'ios',
  updated_at timestamptz not null default now(),
  primary key (profile_id, token)
);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table profiles           enable row level security;
alter table squads             enable row level security;
alter table squad_members      enable row level security;
alter table squad_players      enable row level security;
alter table matches            enable row level security;
alter table match_teams        enable row level security;
alter table match_team_players enable row level security;
alter table match_sets         enable row level security;
alter table match_points       enable row level security;
alter table push_tokens        enable row level security;

-- profiles: anyone signed in can read (needed to render squad member names); own row is writable.
create policy profiles_select on profiles for select to authenticated using (true);
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- squads: members read; owner writes. Anyone may look up by invite code via the RPC below.
create policy squads_select on squads for select to authenticated
  using (is_squad_member(id) or owner_id = auth.uid());
create policy squads_insert on squads for insert to authenticated
  with check (owner_id = auth.uid());
create policy squads_update on squads for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy squads_delete on squads for delete to authenticated
  using (owner_id = auth.uid());

create policy squad_members_select on squad_members for select to authenticated
  using (is_squad_member(squad_id) or profile_id = auth.uid());
create policy squad_members_insert on squad_members for insert to authenticated
  with check (profile_id = auth.uid());          -- you join yourself, via join_squad()
create policy squad_members_delete on squad_members for delete to authenticated
  using (profile_id = auth.uid()
      or exists (select 1 from squads s where s.id = squad_id and s.owner_id = auth.uid()));

create policy squad_players_select on squad_players for select to authenticated
  using (is_squad_member(squad_id));
create policy squad_players_insert on squad_players for insert to authenticated
  with check (is_squad_member(squad_id));
create policy squad_players_update on squad_players for update to authenticated
  using (is_squad_member(squad_id)) with check (is_squad_member(squad_id));

create policy matches_select on matches for select to authenticated
  using (is_squad_member(squad_id));
create policy matches_insert on matches for insert to authenticated
  with check (created_by = auth.uid() and is_squad_member(squad_id));
create policy matches_update on matches for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy matches_delete on matches for delete to authenticated
  using (created_by = auth.uid());

-- Child tables inherit their parent's visibility.
create function can_read_match(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from matches m
    where m.id = target and is_squad_member(m.squad_id)
  );
$$;

create function can_write_match(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from matches m
    where m.id = target and m.created_by = auth.uid()
  );
$$;

create policy match_teams_select on match_teams for select to authenticated using (can_read_match(match_id));
create policy match_teams_write  on match_teams for all    to authenticated using (can_write_match(match_id)) with check (can_write_match(match_id));

create policy mtp_select on match_team_players for select to authenticated using (can_read_match(match_id));
create policy mtp_write  on match_team_players for all    to authenticated using (can_write_match(match_id)) with check (can_write_match(match_id));

create policy match_sets_select on match_sets for select to authenticated using (can_read_match(match_id));
create policy match_sets_write  on match_sets for all    to authenticated using (can_write_match(match_id)) with check (can_write_match(match_id));

create policy match_points_select on match_points for select to authenticated using (can_read_match(match_id));
create policy match_points_write  on match_points for all    to authenticated using (can_write_match(match_id)) with check (can_write_match(match_id));

create policy push_tokens_all on push_tokens for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- RPC: create a squad and join it in one transaction
-- ---------------------------------------------------------------------------

create function create_squad(squad_name text) returns squads
language plpgsql security invoker set search_path = public as $$
declare s squads;
begin
  insert into squads (name, owner_id) values (squad_name, auth.uid()) returning * into s;
  insert into squad_members (squad_id, profile_id, role) values (s.id, auth.uid(), 'owner');
  return s;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: join by invite code
-- security definer, because the joiner cannot SELECT the squad until they are in it.
-- ---------------------------------------------------------------------------

create function join_squad(code text) returns squads
language plpgsql security definer set search_path = public as $$
declare s squads;
begin
  select * into s from squads where invite_code = upper(trim(code));
  if s.id is null then
    raise exception 'No squad with that invite code' using errcode = 'no_data_found';
  end if;
  insert into squad_members (squad_id, profile_id, role)
  values (s.id, auth.uid(), 'member')
  on conflict do nothing;
  return s;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: sync a whole match atomically, idempotent on client_id
-- ---------------------------------------------------------------------------

create function sync_match(payload jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  m_id  uuid;
  team  jsonb;
  st    jsonb;
  pts   jsonb;
  i     integer;
begin
  insert into matches (
    client_id, squad_id, created_by, sport, format, court,
    started_at, ended_at, status, winner_team, synced_at
  ) values (
    (payload->>'client_id')::uuid,
    (payload->>'squad_id')::uuid,
    auth.uid(),
    coalesce(payload->>'sport', 'padel'),
    payload->'format',
    payload->>'court',
    (payload->>'started_at')::timestamptz,
    nullif(payload->>'ended_at', '')::timestamptz,
    coalesce(payload->>'status', 'complete'),
    nullif(payload->>'winner_team', '')::smallint,
    now()
  )
  on conflict (client_id) do update set
    ended_at    = excluded.ended_at,
    status      = excluded.status,
    winner_team = excluded.winner_team,
    court       = excluded.court,
    synced_at   = now()
  returning id into m_id;

  -- Children are replaced wholesale: a match is small and this keeps retries clean.
  delete from match_team_players where match_id = m_id;
  delete from match_teams        where match_id = m_id;
  delete from match_sets         where match_id = m_id;
  delete from match_points       where match_id = m_id;

  for team in select * from jsonb_array_elements(payload->'teams') loop
    insert into match_teams (match_id, team_index, label)
    values (m_id, (team->>'team_index')::smallint, team->>'label');

    i := 0;
    for pts in select * from jsonb_array_elements(team->'player_ids') loop
      insert into match_team_players (match_id, team_index, player_id, position)
      values (m_id, (team->>'team_index')::smallint, (pts #>> '{}')::uuid, i);
      i := i + 1;
    end loop;
  end loop;

  i := 0;
  for st in select * from jsonb_array_elements(coalesce(payload->'sets', '[]'::jsonb)) loop
    insert into match_sets (match_id, set_index, games_a, games_b, tiebreak)
    values (m_id, i, (st->>'games_a')::smallint, (st->>'games_b')::smallint,
            coalesce((st->>'tiebreak')::boolean, false));
    i := i + 1;
  end loop;

  insert into match_points (match_id, seq, winning_team)
  select m_id, (ord - 1)::integer, (value #>> '{}')::smallint
  from jsonb_array_elements(coalesce(payload->'timeline', '[]'::jsonb)) with ordinality as x(value, ord);

  return m_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- View: the session ladder (wins and losses per roster player)
-- ---------------------------------------------------------------------------

create view player_records as
select
  p.id       as player_id,
  p.squad_id,
  p.display_name,
  count(*) filter (where m.status = 'complete' and m.winner_team = tp.team_index) as wins,
  count(*) filter (where m.status = 'complete' and m.winner_team <> tp.team_index) as losses,
  max(m.ended_at) as last_played_at
from squad_players p
left join match_team_players tp on tp.player_id = p.id
left join matches m             on m.id = tp.match_id
group by p.id, p.squad_id, p.display_name;
