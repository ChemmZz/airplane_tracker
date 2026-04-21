import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { MAX_FAVORITE_REGIONS } from "@/lib/favorites";
import { LIVE_REGION_POLL_INTERVAL_MS } from "@/lib/live-region";
import { supabaseForUser } from "@/lib/supabase-server";
import type { Region } from "@/lib/types";
import { LiveRegionPanel } from "./live-region-panel";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = await supabaseForUser();
  type LiveRegionRow = { region_id: string; regions: Region; is_paused: boolean };
  const [{ data: favorites, error }, { data: liveRegion, error: liveRegionError }] = await Promise.all([
    supabase
      .from("user_favorites")
      .select("region_id, regions(*)")
      .returns<Array<{ region_id: string; regions: Region }>>(),
    supabase
      .from("user_live_regions")
      .select("region_id, is_paused, regions(*)")
      .returns<LiveRegionRow>()
      .maybeSingle(),
  ]);

  if (error || liveRegionError) {
    return (
      <div className="rounded-lg border border-amber-700/60 bg-amber-950/30 p-6">
        <h1 className="text-2xl font-bold">Dashboard unavailable</h1>
        <p className="mt-2 text-amber-100/80">{error?.message ?? liveRegionError?.message}</p>
      </div>
    );
  }

  const regions = (favorites ?? []).map((f) => f.regions).filter(Boolean) as Region[];
  const activeRegionRow = liveRegion as LiveRegionRow | null;
  const activeRegion = activeRegionRow?.regions ?? null;

  if (regions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-700 p-10 text-center">
        <h2 className="text-xl font-semibold">No favorites yet</h2>
        <p className="mt-2 text-slate-400">Pick up to {MAX_FAVORITE_REGIONS} regions to start watching.</p>
        <Link
          href="/regions"
          className="mt-6 inline-block rounded-md bg-sky-500 px-4 py-2 font-medium text-white hover:bg-sky-400"
        >
          Choose regions
        </Link>
      </div>
    );
  }

  if (!activeRegion) {
    return (
      <div className="rounded-lg border border-dashed border-slate-700 p-10 text-center">
        <h2 className="text-xl font-semibold">Pick a live region</h2>
        <p className="mt-2 text-slate-400">You can save up to {MAX_FAVORITE_REGIONS} regions, but only one streams live at a time.</p>
        <Link
          href="/regions"
          className="mt-6 inline-block rounded-md bg-sky-500 px-4 py-2 font-medium text-white hover:bg-sky-400"
        >
          Choose live region
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Live region</h1>
          <p className="mt-1 text-sm text-slate-400">
            When active, this region is prioritized by the worker and refreshes about every {LIVE_REGION_POLL_INTERVAL_MS / 1000} seconds.
          </p>
        </div>
        <Link href="/regions" className="text-sm text-sky-300 hover:underline">
          Edit regions
        </Link>
      </div>
      <LiveRegionPanel region={activeRegion} initialPaused={activeRegionRow?.is_paused ?? false} />
    </div>
  );
}
