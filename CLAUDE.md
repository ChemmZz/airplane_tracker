# Flight Pickup Assistant — Architecture

Pickup-oriented flight assistant built for the class assignment. A Railway
worker polls AirLabs for each user’s tracked flight, writes the latest status
and position to Supabase, and a Next.js frontend reads that row live through
Supabase Realtime. The user also shares browser location so the app can
calculate a driving ETA to the arrival airport and recommend when to leave.

```
┌──────────────┐     ┌─────────────────────┐     ┌──────────────────┐     ┌──────────────┐
│   AirLabs    │────►│  Worker (Railway)   │────►│     Supabase     │────►│  Next.js     │
│ flight info  │     │  poll + normalize + │     │  tracked_flights │     │  web         │
│ + live pos   │     │  notification events│     │  + notifications │     │  (Vercel)    │
└──────────────┘     └─────────────────────┘     └──────────────────┘     └──────────────┘
                                                                      ▲            │
                                                                      │            ▼
                                                           Clerk JWT / RLS     Browser location
                                                                                     │
                                                                                     ▼
                                                                             OpenRouteService
```

## Product Shape

- One active tracked flight per user.
- Dashboard shows:
  - live flight status
  - live aircraft position when available
  - driving ETA to the arrival airport
  - recommended departure time
  - recent notification events
- Worker records in-app notifications for major changes and leave-time reminders.

## Data Flow

1. User enters a flight code on `/flight`.
2. Server resolves the flight and airports through AirLabs and upserts one row
   into `tracked_flights`.
3. Worker round-robins through tracked flights every minute and refreshes each
   row from AirLabs.
4. Worker computes leave timing from:
   - estimated arrival
   - stored driving duration
   - pickup buffer minutes
5. Worker records notification events in `notification_events`.
6. Dashboard subscribes to the user’s `tracked_flights` row via Supabase
   Realtime so the view updates without page refresh.
7. Browser location is posted to `/api/travel-plan`, which calculates driving
   ETA with OpenRouteService and updates the tracked flight row.

## Main Tables

| Table | Role |
|---|---|
| `tracked_flights` | One active tracked flight per user, plus current status, position, route ETA, and leave timing |
| `notification_events` | Dedupe/history for in-app notification events |
| `flights`, `regions`, `user_favorites`, `user_live_regions` | Legacy tables from the earlier tracker iteration |

## Main Routes

| Route | Purpose |
|---|---|
| `/` | Landing page |
| `/flight` | Select or replace the active tracked flight |
| `/dashboard` | Live pickup dashboard |
| `/api/tracked-flight` | Resolve a flight from AirLabs and save it for the user |
| `/api/travel-plan` | Update browser-origin driving ETA to the arrival airport |

## Environment Variables

### `apps/web`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `AIRLABS_API_KEY`
- `OPENROUTESERVICE_API_KEY`

### `apps/worker`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AIRLABS_API_KEY`
