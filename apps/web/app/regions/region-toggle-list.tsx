"use client";

import { useState, useTransition } from "react";
import { useSupabase } from "@/lib/supabase-browser";
import { useUser } from "@clerk/nextjs";
import type { Region } from "@/lib/types";
import { MAX_FAVORITE_REGIONS } from "@/lib/favorites";

export function RegionToggleList({
  regions,
  initialFavorites,
  initialLiveRegionId,
  initialLiveRegionPaused,
}: {
  regions: Region[];
  initialFavorites: string[];
  initialLiveRegionId: string | null;
  initialLiveRegionPaused: boolean;
}) {
  const supabase = useSupabase();
  const { user } = useUser();
  const [favs, setFavs] = useState<Set<string>>(new Set(initialFavorites));
  const [liveRegionId, setLiveRegionId] = useState<string | null>(initialLiveRegionId);
  const [livePaused, setLivePaused] = useState(initialLiveRegionPaused);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggle(regionId: string) {
    if (!user) return;
    const isFav = favs.has(regionId);
    if (!isFav && favs.size >= MAX_FAVORITE_REGIONS) {
      setError(`You can only follow ${MAX_FAVORITE_REGIONS} regions at a time.`);
      return;
    }

    setError(null);
    const previous = new Set(favs);
    const previousLiveRegionId = liveRegionId;
    const previousLivePaused = livePaused;
    const next = new Set(favs);
    let nextLiveRegionId = liveRegionId;
    let nextLivePaused = livePaused;
    if (isFav) {
      next.delete(regionId);
      if (liveRegionId === regionId) {
        nextLiveRegionId = next.values().next().value ?? null;
        if (!nextLiveRegionId) nextLivePaused = false;
      }
    } else {
      next.add(regionId);
      if (!liveRegionId) {
        nextLiveRegionId = regionId;
        nextLivePaused = false;
      }
    }
    setFavs(next);
    setLiveRegionId(nextLiveRegionId);
    setLivePaused(nextLivePaused);

    startTransition(async () => {
      const { error: mutationError } = isFav
        ? await supabase
          .from("user_favorites")
          .delete()
          .eq("clerk_user_id", user.id)
          .eq("region_id", regionId)
        : await supabase
          .from("user_favorites")
          .insert({ clerk_user_id: user.id, region_id: regionId });

      if (mutationError) {
        setFavs(previous);
        setLiveRegionId(previousLiveRegionId);
        setLivePaused(previousLivePaused);
        setError(mutationError.message);
        return;
      }

      if (nextLiveRegionId !== previousLiveRegionId || nextLivePaused !== previousLivePaused) {
        const { error: liveRegionError } = nextLiveRegionId
          ? await supabase
            .from("user_live_regions")
            .upsert(
              { clerk_user_id: user.id, region_id: nextLiveRegionId, is_paused: nextLivePaused },
              { onConflict: "clerk_user_id" },
            )
          : await supabase
            .from("user_live_regions")
            .delete()
            .eq("clerk_user_id", user.id);

        if (liveRegionError) {
          setFavs(previous);
          setLiveRegionId(previousLiveRegionId);
          setLivePaused(previousLivePaused);
          setError(liveRegionError.message);
        }
      }
    });
  }

  function setLive(regionId: string) {
    if (!user || !favs.has(regionId) || liveRegionId === regionId) return;
    const previousLiveRegionId = liveRegionId;
    const previousLivePaused = livePaused;
    setError(null);
    setLiveRegionId(regionId);
    setLivePaused(false);

    startTransition(async () => {
      const { error: liveRegionError } = await supabase
        .from("user_live_regions")
        .upsert({ clerk_user_id: user.id, region_id: regionId, is_paused: false }, { onConflict: "clerk_user_id" });

      if (liveRegionError) {
        setLiveRegionId(previousLiveRegionId);
        setLivePaused(previousLivePaused);
        setError(liveRegionError.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="space-y-2">
            <p className="text-slate-300">
              Following <span className="font-semibold text-white">{favs.size}</span> of{" "}
              <span className="font-semibold text-white">{MAX_FAVORITE_REGIONS}</span> regions
            </p>
            <div className="flex items-center gap-2" aria-hidden="true">
              {Array.from({ length: MAX_FAVORITE_REGIONS }).map((_, idx) => {
                const filled = idx < favs.size;
                return (
                  <span
                    key={idx}
                    className={`h-2.5 w-10 rounded-full transition ${
                      filled ? "bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.45)]" : "bg-slate-800"
                    }`}
                  />
                );
              })}
            </div>
          </div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            {liveRegionId ? (livePaused ? "live paused" : "1 live now") : "pick a live region"}
          </p>
        </div>
        {error ? <p className="text-rose-300">{error}</p> : null}
      </div>

      <ul className="grid gap-3 md:grid-cols-2">
        {regions.map((r) => {
          const isFav = favs.has(r.id);
          const isLive = liveRegionId === r.id;
          const atLimit = favs.size >= MAX_FAVORITE_REGIONS;
          return (
            <li key={r.id}>
              <div
                className={`rounded-lg border p-4 transition ${
                  isLive
                    ? "border-emerald-500/70 bg-emerald-500/10"
                    : isFav
                      ? "border-sky-500 bg-sky-500/10"
                      : atLimit
                        ? "border-slate-800 bg-slate-950/60 opacity-60"
                        : "border-slate-800 bg-slate-900/40"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{r.name}</span>
                  <span
                    className={`text-xs ${
                      isLive ? "text-emerald-300" : isFav ? "text-sky-300" : "text-slate-500"
                    }`}
                  >
                    {isLive ? "Live" : isFav ? "Saved" : atLimit ? "limit reached" : "Available"}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  lat {r.lamin.toFixed(1)} → {r.lamax.toFixed(1)} · lon{" "}
                  {r.lomin.toFixed(1)} → {r.lomax.toFixed(1)}
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggle(r.id)}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                      isFav
                        ? "bg-slate-800 text-slate-100 hover:bg-slate-700"
                        : atLimit
                          ? "cursor-not-allowed bg-slate-900 text-slate-500"
                          : "bg-sky-500 text-white hover:bg-sky-400"
                    }`}
                    disabled={!isFav && atLimit}
                    aria-disabled={!isFav && atLimit}
                  >
                    {isFav ? "Remove" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLive(r.id)}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                      isLive
                        ? "bg-emerald-500/20 text-emerald-200"
                        : isFav
                          ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                          : "cursor-not-allowed bg-slate-900 text-slate-500"
                    }`}
                    disabled={!isFav || isLive}
                    aria-disabled={!isFav || isLive}
                  >
                    {isLive ? "Live now" : "Set live"}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
