"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useSupabase } from "@/lib/supabase-browser";
import { useRealtimeFlights } from "@/hooks/useRealtimeFlights";
import type { Flight } from "@/lib/types";

const FlightMap = dynamic(() => import("@/components/FlightMap"), { ssr: false });

export function FlightLiveView({ callsign }: { callsign: string }) {
  const supabase = useSupabase();
  const [icao24, setIcao24] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [looking, setLooking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLooking(true);
      setError(null);
      const res = await fetch(`/api/lookup?callsign=${encodeURIComponent(callsign)}`, {
        method: "POST",
      });
      if (cancelled) return;
      if (!res.ok) {
        setError(await res.text());
        setLooking(false);
        return;
      }
      const body = (await res.json()) as { icao24: string | null };
      setIcao24(body.icao24);
      setLooking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [callsign]);

  const { flights } = useRealtimeFlights(supabase, icao24 ? { icao24 } : {});
  const match = flights.find((f) => f.icao24 === icao24);

  if (looking) return <p className="text-slate-400">Asking OpenSky for {callsign}…</p>;
  if (error) return <p className="text-red-400">{error}</p>;
  if (!icao24) return <p className="text-slate-400">Not currently tracked by OpenSky.</p>;

  return (
    <div className="space-y-4">
      {match ? <FlightDetails f={match} /> : <p className="text-slate-400">Waiting for position…</p>}
      <div className="h-96 overflow-hidden rounded-md border border-slate-800">
        <FlightMap
          flights={match ? [match] : []}
          singleIcao={icao24 ?? undefined}
        />
      </div>
    </div>
  );
}

function FlightDetails({ f }: { f: Flight }) {
  return (
    <dl className="grid grid-cols-2 gap-2 rounded-md border border-slate-800 bg-slate-900/40 p-4 text-sm">
      <Row k="Callsign" v={f.callsign ?? "—"} />
      <Row k="ICAO24" v={f.icao24} />
      <Row k="Country" v={f.origin_country ?? "—"} />
      <Row k="On ground" v={f.on_ground ? "yes" : "no"} />
      <Row
        k="Altitude (m)"
        v={f.baro_altitude != null ? String(Math.round(f.baro_altitude)) : "—"}
      />
      <Row
        k="Speed (kt)"
        v={f.velocity != null ? String(Math.round(f.velocity * 1.944)) : "—"}
      />
      <Row
        k="Heading"
        v={f.true_track != null ? `${Math.round(f.true_track)}°` : "—"}
      />
      <Row k="Squawk" v={f.squawk ?? "—"} />
    </dl>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="contents">
      <dt className="text-slate-400">{k}</dt>
      <dd className="font-mono">{v}</dd>
    </div>
  );
}
