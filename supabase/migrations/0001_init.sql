-- airplane_tracker schema
-- Apply via Supabase SQL editor or MCP server.

create extension if not exists "pgcrypto";

---------------------------------------------------------------
-- regions: preset bounding boxes shown to users as favorites
---------------------------------------------------------------
create table if not exists regions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  lamin double precision not null,
  lomin double precision not null,
  lamax double precision not null,
  lomax double precision not null
);

---------------------------------------------------------------
-- flights: latest state per aircraft (upsert by icao24)
---------------------------------------------------------------
create table if not exists flights (
  icao24 text primary key,
  callsign text,
  origin_country text,
  longitude double precision,
  latitude double precision,
  baro_altitude double precision,
  velocity double precision,
  true_track double precision,
  vertical_rate double precision,
  on_ground boolean,
  squawk text,
  region_id uuid references regions(id) on delete set null,
  time_position timestamptz,
  last_contact timestamptz,
  last_seen_at timestamptz not null default now(),
  source text not null default 'region' check (source in ('region', 'lookup'))
);

create index if not exists flights_region_id_idx on flights (region_id);
create index if not exists flights_callsign_idx on flights (callsign);
create index if not exists flights_last_seen_at_idx on flights (last_seen_at);

---------------------------------------------------------------
-- user_favorites: a Clerk user's favorited regions
---------------------------------------------------------------
create table if not exists user_favorites (
  clerk_user_id text not null,
  region_id uuid references regions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (clerk_user_id, region_id)
);

create index if not exists user_favorites_user_idx on user_favorites (clerk_user_id);

---------------------------------------------------------------
-- Row-level security
---------------------------------------------------------------
alter table regions enable row level security;
alter table flights enable row level security;
alter table user_favorites enable row level security;

-- regions: public read (signed-in anon key is fine)
drop policy if exists "regions_public_read" on regions;
create policy "regions_public_read" on regions
  for select using (true);

-- flights: public read (no PII; everyone sees the same live data)
drop policy if exists "flights_public_read" on flights;
create policy "flights_public_read" on flights
  for select using (true);

-- user_favorites: owner-only via Clerk JWT sub claim
drop policy if exists "user_favorites_owner_select" on user_favorites;
create policy "user_favorites_owner_select" on user_favorites
  for select using (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "user_favorites_owner_insert" on user_favorites;
create policy "user_favorites_owner_insert" on user_favorites
  for insert with check (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "user_favorites_owner_delete" on user_favorites;
create policy "user_favorites_owner_delete" on user_favorites
  for delete using (auth.jwt() ->> 'sub' = clerk_user_id);

---------------------------------------------------------------
-- Seed preset regions (idempotent via slug)
---------------------------------------------------------------
insert into regions (slug, name, lamin, lomin, lamax, lomax) values
  ('us-east',     'US East Coast',          25.0,  -82.0,  45.0,  -66.0),
  ('us-west',     'US West Coast',          32.0, -125.0,  49.0, -115.0),
  ('europe',      'Western Europe',         36.0,  -10.0,  55.0,   15.0),
  ('east-asia',   'East Asia (JP/KR)',      30.0,  125.0,  46.0,  146.0),
  ('oceania',     'Australia Southeast',   -40.0,  140.0, -28.0,  155.0),
  ('n-atlantic',  'North Atlantic Corridor', 40.0, -60.0,  60.0,  -10.0)
on conflict (slug) do nothing;

---------------------------------------------------------------
-- Realtime: publish INSERT/UPDATE/DELETE on flights
-- (Also toggle in Dashboard → Database → Replication if needed.)
---------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'flights'
  ) then
    alter publication supabase_realtime add table flights;
  end if;
end $$;
