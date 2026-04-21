import { auth } from "@clerk/nextjs/server";
import { supabaseForUser, supabasePublic } from "@/lib/supabase-server";
import { MAX_FAVORITE_REGIONS } from "@/lib/favorites";
import { LIVE_REGION_POLL_INTERVAL_MS } from "@/lib/live-region";
import type { Region } from "@/lib/types";
import { RegionToggleList } from "./region-toggle-list";

export const dynamic = "force-dynamic";

export default async function RegionsPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const [publicSupabase, userSupabase] = await Promise.all([
    Promise.resolve(supabasePublic()),
    supabaseForUser(),
  ]);
  const [
    { data: regions, error: regionsError },
    { data: favorites, error: favoritesError },
    { data: liveRegion, error: liveRegionError },
  ] = await Promise.all([
    publicSupabase.from("regions").select("*").order("name"),
    userSupabase.from("user_favorites").select("region_id"),
    userSupabase.from("user_live_regions").select("region_id, is_paused").maybeSingle(),
  ]);

  if (regionsError || favoritesError || liveRegionError) {
    return (
      <div className="rounded-lg border border-amber-700/60 bg-amber-950/30 p-6">
        <h1 className="text-2xl font-bold">Regions unavailable</h1>
        <p className="mt-2 text-amber-100/80">
          {regionsError?.message ?? favoritesError?.message ?? liveRegionError?.message}
        </p>
      </div>
    );
  }

  if (!regions?.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-700 p-6">
        <h1 className="text-2xl font-bold">No regions found</h1>
        <p className="mt-2 text-slate-400">
          The `regions` table is empty. Re-run the seed section in `supabase/migrations/0001_init.sql`.
        </p>
      </div>
    );
  }

  const favoriteIds = new Set((favorites ?? []).map((f) => f.region_id as string));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Regions</h1>
          <p className="mt-1 text-slate-400">
            Pick up to {MAX_FAVORITE_REGIONS} regions. Choose one as live and it will refresh about every{" "}
            {LIVE_REGION_POLL_INTERVAL_MS / 1000} seconds.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-sky-200">
          <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
          One live region at a time
        </div>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-300">Refresh behavior</p>
        <div className="mt-3 space-y-2 text-sm text-slate-300">
          <p>The app saves up to {MAX_FAVORITE_REGIONS} favorite regions, but only one of them is your live region.</p>
          <p>That live region is the one the worker prioritizes, and when active it refreshes about every {LIVE_REGION_POLL_INTERVAL_MS / 1000} seconds.</p>
          <p>If you pause live updates, the dashboard keeps showing the last cached state and the worker stops spending new polling credits for your live region until you resume.</p>
          <p>Saved regions that are not live remain available to switch to later, but they are not the high-frequency stream.</p>
        </div>
      </div>
      <RegionToggleList
        regions={(regions ?? []) as Region[]}
        initialFavorites={[...favoriteIds]}
        initialLiveRegionId={(liveRegion?.region_id as string | undefined) ?? null}
        initialLiveRegionPaused={Boolean(liveRegion?.is_paused)}
      />
    </div>
  );
}
