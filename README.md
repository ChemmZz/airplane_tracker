# ✈ Flight Pickup Assistant

Single-flight pickup planner. The worker polls AirLabs for one tracked flight per
user, stores updates in Supabase, and the Next.js frontend shows the flight
live alongside a driving ETA to the arrival airport.

- **Worker** → Railway (`apps/worker`)
- **Frontend** → Vercel (`apps/web`)
- **DB** → Supabase (Postgres + Realtime)
- **Auth** → Clerk (JWT template → Supabase RLS)
- **Flight data** → AirLabs
- **Driving ETA** → OpenRouteService
- **Notifications** → In-app feed

See `CLAUDE.md` for architecture details.

## Quickstart

```bash
pnpm install

# Fill in each app's env
cp apps/web/.env.example apps/web/.env.local
cp apps/worker/.env.example apps/worker/.env.local
# …edit them

# Apply DB schema (Supabase SQL editor or MCP)
# supabase/migrations/0001_init.sql
# supabase/migrations/0002_limit_user_favorites.sql
# supabase/migrations/0003_user_live_regions.sql
# supabase/migrations/0004_pause_live_regions.sql
# supabase/migrations/0005_pickup_assistant.sql

pnpm dev:web
pnpm dev:worker
```

## Deploying The Web App To Vercel

The Next.js frontend lives in `apps/web`. In Vercel, create the project from
this repo and set the `Root Directory` to `apps/web`.

- Framework preset: `Next.js`
- Node.js version: `20.x` or newer
- Build command: leave the default (`next build`)

Before deploying, add the web app environment variables in Vercel:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AIRLABS_API_KEY=
OPENSKY_CLIENT_ID=
OPENSKY_CLIENT_SECRET=
OPENROUTESERVICE_API_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is required at build time. If it is missing,
Vercel can fail while prerendering shared routes such as `/_not-found`.
