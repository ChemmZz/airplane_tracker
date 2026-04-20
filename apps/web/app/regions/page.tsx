import { auth } from "@clerk/nextjs/server";
import { supabaseForUser } from "@/lib/supabase-server";
import type { Region } from "@/lib/types";
import { RegionToggleList } from "./region-toggle-list";

export const dynamic = "force-dynamic";

export default async function RegionsPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = await supabaseForUser();
  const [{ data: regions }, { data: favorites }] = await Promise.all([
    supabase.from("regions").select("*").order("name"),
    supabase.from("user_favorites").select("region_id"),
  ]);

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
