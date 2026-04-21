"use client";

import { useState, useTransition } from "react";
import { useSupabase } from "@/lib/supabase-browser";
import { useUser } from "@clerk/nextjs";
import type { Region } from "@/lib/types";
import { MAX_FAVORITE_REGIONS } from "@/lib/favorites";

export function RegionToggleList({
  regions,
  initialFavorites,
}: {
  regions: Region[];
  initialFavorites: string[];
}) {
  const supabase = useSupabase();
  const { user } = useUser();
  const [favs, setFavs] = useState<Set<string>>(new Set(initialFavorites));
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
    const next = new Set(favs);
    if (isFav) next.delete(regionId);
    else next.add(regionId);
    setFavs(next);

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
        setError(mutationError.message);
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
            {MAX_FAVORITE_REGIONS - favs.size} slot{MAX_FAVORITE_REGIONS - favs.size === 1 ? "" : "s"} left
          </p>
        </div>
        {error ? <p className="text-rose-300">{error}</p> : null}
      </div>

      <ul className="grid gap-3 md:grid-cols-2">
        {regions.map((r) => {
          const isFav = favs.has(r.id);
          const atLimit = favs.size >= MAX_FAVORITE_REGIONS;
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => toggle(r.id)}
                className={`w-full rounded-lg border p-4 text-left transition ${
                  isFav
                    ? "border-sky-500 bg-sky-500/10"
                    : atLimit
                      ? "cursor-not-allowed border-slate-800 bg-slate-950/60 opacity-60"
                      : "border-slate-800 bg-slate-900/40 hover:border-slate-600"
                }`}
                disabled={!isFav && atLimit}
                aria-disabled={!isFav && atLimit}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{r.name}</span>
                  <span
                    className={`text-xs ${isFav ? "text-sky-300" : "text-slate-500"}`}
                  >
                    {isFav ? "★ favorited" : atLimit ? "limit reached" : "☆ favorite"}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  lat {r.lamin.toFixed(1)} → {r.lamax.toFixed(1)} · lon{" "}
                  {r.lomin.toFixed(1)} → {r.lomax.toFixed(1)}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
