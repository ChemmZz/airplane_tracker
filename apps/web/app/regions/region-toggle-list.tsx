"use client";

import { useState, useTransition } from "react";
import { useSupabase } from "@/lib/supabase-browser";
import { useUser } from "@clerk/nextjs";
import type { Region } from "@/lib/types";

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
  const [, startTransition] = useTransition();

  function toggle(regionId: string) {
    if (!user) return;
    const isFav = favs.has(regionId);
    const next = new Set(favs);
    if (isFav) next.delete(regionId);
    else next.add(regionId);
    setFavs(next);

    startTransition(async () => {
      if (isFav) {
        await supabase
          .from("user_favorites")
          .delete()
          .eq("clerk_user_id", user.id)
          .eq("region_id", regionId);
      } else {
        await supabase
          .from("user_favorites")
          .insert({ clerk_user_id: user.id, region_id: regionId });
      }
    });
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {regions.map((r) => {
        const isFav = favs.has(r.id);
        return (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => toggle(r.id)}
              className={`w-full rounded-lg border p-4 text-left transition ${
                isFav
                  ? "border-sky-500 bg-sky-500/10"
                  : "border-slate-800 bg-slate-900/40 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{r.name}</span>
                <span
                  className={`text-xs ${isFav ? "text-sky-300" : "text-slate-500"}`}
                >
                  {isFav ? "★ favorited" : "☆ favorite"}
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
  );
}
