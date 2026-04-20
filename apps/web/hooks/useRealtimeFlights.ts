"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Flight } from "@/lib/types";

export function useRealtimeFlights(
  supabase: SupabaseClient,
  opts: { regionId?: string; icao24?: string },
) {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function seed() {
      let q = supabase.from("flights").select("*");
      if (opts.regionId) q = q.eq("region_id", opts.regionId);
      if (opts.icao24) q = q.eq("icao24", opts.icao24);
      const { data } = await q.order("last_seen_at", { ascending: false }).limit(500);
      if (!cancelled && data) {
        setFlights(data as Flight[]);
        setLoading(false);
      }
    }
    seed();

    const filter = opts.regionId
      ? `region_id=eq.${opts.regionId}`
      : opts.icao24
        ? `icao24=eq.${opts.icao24}`
        : undefined;
    const channelName = `flights:${opts.regionId ?? opts.icao24 ?? "all"}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "flights", filter },
        (payload) => {
          setFlights((prev) => {
            if (payload.eventType === "DELETE") {
              const old = payload.old as { icao24?: string };
              return prev.filter((f) => f.icao24 !== old.icao24);
            }
            const row = payload.new as Flight;
            const idx = prev.findIndex((f) => f.icao24 === row.icao24);
            if (idx === -1) return [row, ...prev];
            const next = [...prev];
            next[idx] = row;
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase, opts.regionId, opts.icao24]);

  return { flights, loading };
}
