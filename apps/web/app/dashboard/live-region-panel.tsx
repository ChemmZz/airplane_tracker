"use client";

import { useState, useTransition } from "react";
import { useUser } from "@clerk/nextjs";
import { useSupabase } from "@/lib/supabase-browser";
import { RegionCard } from "@/components/RegionCard";
import type { Region } from "@/lib/types";

export function LiveRegionPanel({
  region,
  initialPaused,
}: {
  region: Region;
  initialPaused: boolean;
}) {
  const supabase = useSupabase();
  const { user } = useUser();
  const [paused, setPaused] = useState(initialPaused);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function togglePaused() {
    if (!user) return;
    const previous = paused;
    const next = !paused;
    setError(null);
    setPaused(next);

    startTransition(async () => {
      const { error: pauseError } = await supabase
        .from("user_live_regions")
        .update({ is_paused: next })
        .eq("clerk_user_id", user.id);

      if (pauseError) {
        setPaused(previous);
        setError(pauseError.message);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3">
        <p className="text-sm text-slate-300">
          {paused
            ? "Live polling is paused. The map stays on the last cached state."
            : "Live polling is active for this region."}
        </p>
        <button
          type="button"
          onClick={togglePaused}
          className={`rounded-md px-3 py-2 text-sm font-medium transition ${
            paused
              ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
              : "bg-amber-500 text-slate-950 hover:bg-amber-400"
          }`}
        >
          {paused ? "Resume live updates" : "Pause live updates"}
        </button>
      </div>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <RegionCard region={region} paused={paused} />
    </div>
  );
}
