"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { formatUtc } from "@/lib/tracked-flight";

type ArrivalRow = {
  airline_name: string;
  airline_iata: string | null;
  flight_iata: string | null;
  flight_number: string | null;
  status: string;
  origin_code: string;
  origin_name: string;
  estimated_arrival_utc: string | null;
};

export function ArrivalBoard({
  airportCode,
  airportName,
  rows,
}: {
  airportCode: string;
  airportName: string;
  rows: ArrivalRow[];
}) {
  const router = useRouter();
  const { user } = useUser();
  const [loadingCode, setLoadingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function track(code: string) {
    const email = user?.primaryEmailAddress?.emailAddress;
    if (!email) {
      setError("Your account needs a primary email before tracking from the arrivals board.");
      return;
    }

    setLoadingCode(code);
    setError(null);
    const res = await fetch("/api/tracked-flight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flightCode: code, notificationEmail: email }),
    });

    if (!res.ok) {
      setLoadingCode(null);
      setError(await res.text());
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-300">Quick selection</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Next arrivals into {airportName}</h2>
          <p className="mt-1 text-sm text-slate-400">{airportCode}</p>
        </div>
        <Link href={`/flight?airport=${encodeURIComponent(airportCode)}`} className="text-sm text-sky-300 hover:underline">
          Refresh board
        </Link>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[920px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="pb-3 pr-4">Flight</th>
              <th className="pb-3 pr-4">Airline</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3 pr-6">Origin</th>
              <th className="pb-3 pr-6">ETA</th>
              <th className="pb-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const code = row.flight_iata ?? row.flight_number ?? "";
              return (
                <tr key={`${code}-${row.origin_code}`} className="border-t border-slate-800 text-slate-200">
                  <td className="py-3 pr-4 font-mono whitespace-nowrap">{code || "—"}</td>
                  <td className="py-3 pr-4 whitespace-nowrap">{row.airline_name}</td>
                  <td className="py-3 pr-4 whitespace-nowrap">{row.status}</td>
                  <td className="py-3 pr-6 min-w-[220px]">
                    <div className="font-medium text-white">{row.origin_name}</div>
                    <div className="text-xs text-slate-500">{row.origin_code}</div>
                  </td>
                  <td className="py-3 pr-6 whitespace-nowrap">{formatUtc(row.estimated_arrival_utc)}</td>
                  <td className="py-3 whitespace-nowrap">
                    {code ? (
                      <button
                        type="button"
                        onClick={() => track(code)}
                        disabled={loadingCode === code}
                        className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {loadingCode === code ? "Tracking…" : "Track"}
                      </button>
                    ) : (
                      <span className="text-slate-500">Unavailable</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? <p className="mt-4 text-sm text-slate-400">No arrivals were returned for this airport.</p> : null}
      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
