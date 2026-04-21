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
