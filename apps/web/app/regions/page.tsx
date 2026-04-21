import { auth } from "@clerk/nextjs/server";
import { supabaseForUser, supabasePublic } from "@/lib/supabase-server";
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
      <div>
        <h1 className="text-2xl font-bold">Regions</h1>
        <p className="mt-1 text-slate-400">
          Tap to favorite. Favorites appear on your dashboard with live updates.
        </p>
      </div>
      <RegionToggleList regions={(regions ?? []) as Region[]} initialFavorites={[...favoriteIds]} />
    </div>
  );
}
