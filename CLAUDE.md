# Airplane Tracker — Architecture

A realtime flight tracker built as a class assignment. Polls the OpenSky Network
for aircraft state vectors, stores them in Supabase, and streams live updates
to a Next.js frontend through Supabase Realtime.

```
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────────┐     ┌──────────────┐
│  OpenSky Network │     │  Worker (Railway)   │     │     Supabase     │     │  Next.js     │
│   REST /states   │────►│  poll + upsert +    │────►│  Postgres +      │────►│  web         │
│   (OAuth2)       │     │  stale-sweep loop   │     │  Realtime pub    │     │  (Vercel)    │
└──────────────────┘     └─────────────────────┘     └──────────────────┘     └──────────────┘
                                                              ▲                       │
                                                              │  RLS via Clerk JWT    ▼
                                                              └───────────────  Browser
```

## Monorepo

```
airplane_tracker/
├── apps/
│   ├── web/          Next.js 15 (App Router) + Tailwind + Clerk + Leaflet
│   └── worker/       Long-running TS (tsx) service on Railway
├── supabase/
│   └── migrations/0001_init.sql
├── package.json (pnpm workspaces)
└── pnpm-workspace.yaml
```

## Data flow

1. **OpenSky** exposes `/states/all` — a list of active state vectors (flat
   arrays: `[icao24, callsign, country, ..., lon, lat, alt, on_ground, vel,
   heading, ...]`). OAuth2 client-credentials grant; 4,000 credits/day.
2. **Worker** (`apps/worker`) loads preset `regions` from Supabase on boot,
   then round-robins through them every 90 seconds. For each region it passes
   the bounding box as `lamin/lomin/lamax/lomax`, upserts rows into
   `flights` (conflict on `icao24`), and stamps `last_seen_at = now()`.
   A second timer runs every 5 minutes to `delete from flights where
   last_seen_at < now() - interval '10 minutes'`.
3. **Supabase Postgres** holds three tables (see `supabase/migrations/0001_init.sql`).
   Realtime publication is enabled on `flights` only.
4. **Next.js frontend** subscribes to `postgres_changes` filtered by
   `region_id=eq.<id>` (or `icao24=eq.<id>` on the lookup page). It also seeds
   the state with a normal select so the first render isn't empty. New rows
   appear live as the worker upserts.
5. **Clerk** handles auth. A JWT template named exactly `supabase` is signed
   with the Supabase project's JWT secret; the browser client attaches the
   token on every request, and RLS policies on `user_favorites` check
   `auth.jwt() ->> 'sub' = clerk_user_id`.

## Tables

| Table | Role | Write path | Read path |
|---|---|---|---|
| `regions` | Preset bounding boxes | Seeded once via migration | Public read |
| `flights` | Latest state per aircraft (keyed by `icao24`) | Worker (service role) + `/api/lookup` (service role) | Public read, Realtime |
| `user_favorites` | Which regions a Clerk user follows | User via RLS | Owner-only via RLS |

## Pages

| Route | Purpose |
|---|---|
| `/` | Landing page, Clerk sign-in CTA |
| `/dashboard` | Grid of favorited regions, each with a live map + top callsigns |
| `/regions` | Toggle favorites on/off |
| `/flight` | Callsign search form |
| `/flight/[callsign]` | Live view for one flight, hits `/api/lookup` first |
| `/api/lookup` | Server-only: hits OpenSky directly, upserts with `source='lookup'` |

## Credit budget

- Authenticated OpenSky: 4,000 credits/day.
- 6 regions × one poll every 90s, round-robin = one region polled every 9 min
  (≈960 polls/day × ~4 credits ≈ 3,840/day). Leaves ~160 credits for on-demand
  callsign lookups. Poll cadence lives in `apps/worker/src/config.ts`.

## Environment variables

### `apps/web` (Vercel)
| Key | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-side DB access (RLS enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | Used only in `/api/lookup` for upserts |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk browser key |
| `CLERK_SECRET_KEY` | Clerk server key |
| `OPENSKY_CLIENT_ID` / `OPENSKY_CLIENT_SECRET` | Lookup route only |

### `apps/worker` (Railway)
| Key | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypass RLS on writes |
| `OPENSKY_CLIENT_ID` / `OPENSKY_CLIENT_SECRET` | API auth |

## Local dev

```
pnpm install
# apps/web/.env.local and apps/worker/.env.local filled in
pnpm dev:web     # http://localhost:3000
pnpm dev:worker  # tails the scheduler loop
```

## Deploy

- **Supabase**: run `supabase/migrations/0001_init.sql` via SQL editor or MCP.
  Confirm Realtime publication includes `flights`.
- **Clerk**: create JWT template named `supabase`, HS256, secret = Supabase
  JWT secret (Settings → API).
- **OpenSky**: register OAuth2 client at opensky-network.org/account/api.
- **Railway**: connect repo, set root to `apps/worker`, add env vars. Deploys
  as a long-running service (not a cron) so the scheduler keeps running.
- **Vercel**: connect repo, set root to `apps/web`, add env vars.

## Gotchas (learned the hard way)

- OpenSky callsigns are space-padded — always `trim()` before storing or
  comparing. `worker/src/upsert.ts` and `web/lib/opensky.ts` both do this.
- OpenSky query params are `lamin/lomin/lamax/lomax`, but the response array
  is `[5]=longitude, [6]=latitude`. Not symmetrical.
- Leaflet touches `window` on import, so `FlightMap` is `dynamic(..., {ssr:false})`.
- Clerk JWT template name must be exactly `supabase`; otherwise RLS silently
  returns zero rows.
- Supabase Realtime needs explicit publication on the table — the migration
  does this, but double-check Dashboard → Database → Replication.
