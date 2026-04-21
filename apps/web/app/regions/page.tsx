import { auth } from "@clerk/nextjs/server";
import { supabaseForUser, supabasePublic } from "@/lib/supabase-server";
import { MAX_FAVORITE_REGIONS } from "@/lib/favorites";
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
  const [{ data: regions, error: regionsError }, { data: favorites, error: favoritesError }] = await Promise.all([
    publicSupabase.from("regions").select("*").order("name"),
    userSupabase.from("user_favorites").select("region_id"),
  ]);

  if (regionsError || favoritesError) {
    return (
      <div className="rounded-lg border border-amber-700/60 bg-amber-950/30 p-6">
        <h1 className="text-2xl font-bold">Regions unavailable</h1>
        <p className="mt-2 text-amber-100/80">
          {regionsError?.message ?? favoritesError?.message}
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
            Pick up to {MAX_FAVORITE_REGIONS} regions. Favorites appear on your dashboard with live updates.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-sky-200">
          <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
          Max {MAX_FAVORITE_REGIONS} live regions
        </div>
      </div>
      <RegionToggleList regions={(regions ?? []) as Region[]} initialFavorites={[...favoriteIds]} />
    </div>
  );
}
