create table if not exists tracked_flights (
  clerk_user_id text primary key,
  notification_email text not null,
  flight_iata text not null,
  flight_icao text,
  airline_iata text,
  airline_icao text,
  flight_number text,
  dep_iata text,
  dep_icao text,
  dep_name text,
  dep_city text,
  dep_lat double precision,
  dep_lng double precision,
  arr_iata text,
  arr_icao text,
  arr_name text,
  arr_city text,
  arr_lat double precision,
  arr_lng double precision,
  aircraft_icao text,
  aircraft_model text,
  status text,
  hex text,
  reg_number text,
  lat double precision,
  lng double precision,
  alt double precision,
  dir double precision,
  speed double precision,
  v_speed double precision,
  dep_time_utc timestamptz,
  dep_estimated_utc timestamptz,
  arr_time_utc timestamptz,
  arr_estimated_utc timestamptz,
  dep_delayed integer,
  arr_delayed integer,
  dep_gate text,
  dep_terminal text,
  arr_gate text,
  arr_terminal text,
  arr_baggage text,
  origin_lat double precision,
  origin_lng double precision,
  origin_label text,
  last_location_at timestamptz,
  drive_duration_minutes integer,
  drive_distance_meters integer,
  pickup_buffer_minutes integer not null default 35,
  leave_by_utc timestamptz,
  leave_stage text not null default 'idle' check (leave_stage in ('idle', 'soon', 'now', 'sent')),
  email_notifications boolean not null default true,
  last_polled_at timestamptz,
  last_signal_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tracked_flights_status_idx on tracked_flights (status);
create index if not exists tracked_flights_email_idx on tracked_flights (email_notifications);

create table if not exists notification_events (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  event_key text not null,
  event_type text not null,
  subject text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (clerk_user_id, event_key)
);

create index if not exists notification_events_user_idx on notification_events (clerk_user_id, sent_at desc);

alter table tracked_flights enable row level security;
alter table notification_events enable row level security;

drop policy if exists "tracked_flights_owner_select" on tracked_flights;
create policy "tracked_flights_owner_select" on tracked_flights
  for select using (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "tracked_flights_owner_insert" on tracked_flights;
create policy "tracked_flights_owner_insert" on tracked_flights
  for insert with check (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "tracked_flights_owner_update" on tracked_flights;
create policy "tracked_flights_owner_update" on tracked_flights
  for update using (auth.jwt() ->> 'sub' = clerk_user_id)
  with check (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "tracked_flights_owner_delete" on tracked_flights;
create policy "tracked_flights_owner_delete" on tracked_flights
  for delete using (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "notification_events_owner_select" on notification_events;
create policy "notification_events_owner_select" on notification_events
  for select using (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "notification_events_owner_insert" on notification_events;
create policy "notification_events_owner_insert" on notification_events
  for insert with check (auth.jwt() ->> 'sub' = clerk_user_id);

create or replace function touch_tracked_flights_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tracked_flights_touch_updated_at on tracked_flights;
create trigger tracked_flights_touch_updated_at
before update on tracked_flights
for each row
execute function touch_tracked_flights_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'tracked_flights'
  ) then
    alter publication supabase_realtime add table tracked_flights;
  end if;
end $$;
