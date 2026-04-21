"use client";

import dynamic from "next/dynamic";
import { useSupabase } from "@/lib/supabase-browser";
import { useRealtimeFlights } from "@/hooks/useRealtimeFlights";
import type { Region } from "@/lib/types";

const FlightMap = dynamic(() => import("./FlightMap"), { ssr: false });

export function RegionCard({
  region,
  paused = false,
}: {
  region: Region;
  paused?: boolean;
}) {
  const supabase = useSupabase();
  const { flights, loading } = useRealtimeFlights(supabase, { regionId: region.id, enabled: !paused });

  const airborne = flights.filter((f) => !f.on_ground && f.latitude != null && f.longitude != null);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{region.name}</h2>
        <div className="flex items-center gap-2">
          {paused ? (
            <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-300">
              paused
            </span>
          ) : null}
          <span className="rounded-full bg-sky-500/20 px-2.5 py-0.5 text-xs font-medium text-sky-300">
            {loading ? "…" : `${airborne.length} in the air`}
          </span>
        </div>
      </div>
      <div className="mt-3 h-64 overflow-hidden rounded-md border border-slate-800">
        <FlightMap region={region} flights={airborne} />
      </div>
      <ul className="mt-3 space-y-1 text-sm text-slate-300">
        {airborne.slice(0, 5).map((f) => (
          <li key={f.icao24} className="flex justify-between">
            <span className="font-mono">{f.callsign ?? f.icao24}</span>
            <span className="text-slate-400">
              {f.baro_altitude != null ? `${Math.round(f.baro_altitude)} m` : "—"}
              {f.velocity != null ? ` · ${Math.round((f.velocity ?? 0) * 1.944)} kt` : ""}
            </span>
          </li>
        ))}
        {!loading && airborne.length === 0 && (
          <li className="text-slate-500">
            {paused ? "Live polling is paused for this region." : "No aircraft yet — waiting for the next poll."}
          </li>
        )}
      </ul>
    </div>
  );
}
