# ✈ Airplane Tracker

Realtime flight tracker. Worker polls the OpenSky Network, Supabase stores the
data and streams it via Realtime, Next.js renders it live in the browser.

- **Worker** → Railway (`apps/worker`)
- **Frontend** → Vercel (`apps/web`)
- **DB** → Supabase (Postgres + Realtime)
- **Auth** → Clerk (JWT template → Supabase RLS)

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

pnpm dev:web     # http://localhost:3000
pnpm dev:worker  # separate terminal
```

## Live URLs

- Frontend: _TBD (Vercel)_
- Worker logs: _TBD (Railway)_
