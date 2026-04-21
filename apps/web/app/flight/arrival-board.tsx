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
  scheduled_arrival_local: string | null;
  scheduled_arrival_utc: string | null;
  estimated_arrival_local: string | null;
  estimated_arrival_utc: string | null;
  actual_arrival_local: string | null;
  actual_arrival_utc: string | null;
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
  const [selectedAirline, setSelectedAirline] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedOrigin, setSelectedOrigin] = useState("all");

  const airlineOptions = [...new Set(rows.map((row) => row.airline_name).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const statusOptions = [...new Set(rows.map((row) => normalizeStatus(row.status)))].sort((a, b) => a.localeCompare(b));
  const originOptions = [...new Set(rows.map((row) => row.origin_name).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const filteredRows = rows.filter((row) => {
    const normalizedStatus = normalizeStatus(row.status);
    return (
      (selectedAirline === "all" || row.airline_name === selectedAirline) &&
      (selectedStatus === "all" || normalizedStatus === selectedStatus) &&
      (selectedOrigin === "all" || row.origin_name === selectedOrigin)
    );
  });

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

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <label className="text-sm text-slate-300">
          <span className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Airline</span>
          <select
            value={selectedAirline}
            onChange={(event) => setSelectedAirline(event.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
          >
            <option value="all">All airlines</option>
            {airlineOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-300">
          <span className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Status</span>
          <select
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
          >
            <option value="all">All statuses</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-300">
          <span className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Origin</span>
          <select
            value={selectedOrigin}
            onChange={(event) => setSelectedOrigin(event.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
          >
            <option value="all">All origins</option>
            {originOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[920px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="pb-3 pr-4">Flight</th>
              <th className="pb-3 pr-4">Airline</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3 pr-6">Origin</th>
              <th className="pb-3 pr-6">Arrival</th>
              <th className="pb-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => {
              const code = row.flight_iata ?? row.flight_number ?? "";
              const statusTone = statusClasses(row.status);
              return (
                <tr key={`${code}-${row.origin_code}`} className="border-t border-slate-800 text-slate-200">
                  <td className="py-3 pr-4 font-mono whitespace-nowrap">{code || "—"}</td>
                  <td className="py-3 pr-4 whitespace-nowrap">{row.airline_name}</td>
                  <td className={`py-3 pr-4 whitespace-nowrap font-semibold ${statusTone}`}>{formatStatusLabel(row.status)}</td>
                  <td className="py-3 pr-6 min-w-[220px]">
                    <div className="font-medium text-white">{row.origin_name}</div>
                    <div className="text-xs text-slate-500">{row.origin_code}</div>
                  </td>
                  <td className="py-3 pr-6 whitespace-nowrap">{formatArrivalDisplay(row)}</td>
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
      {rows.length > 0 && filteredRows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No arrivals match the current filters.</p>
      ) : null}
      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}

function normalizeStatus(status: string) {
  return status.trim().toLowerCase();
}

function formatStatusLabel(status: string) {
  const normalized = normalizeStatus(status);
  return normalized
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function statusClasses(status: string) {
  const normalized = normalizeStatus(status);
  if (normalized.includes("cancel")) return "text-rose-400";
  if (normalized.includes("delay")) return "text-amber-300";
  if (normalized.includes("land")) return "text-white";
  return "text-slate-200";
}

function formatArrivalDisplay(row: ArrivalRow) {
  const normalized = normalizeStatus(row.status);

  if (normalized.includes("cancel")) return "Cancelled";
  if (normalized.includes("land")) {
    const actualArrival = formatAirportBoardTime(row.actual_arrival_local, row.actual_arrival_utc);
    return actualArrival === "—" ? "Arrived" : `Arrived ${actualArrival}`;
  }

  return formatAirportBoardTime(
    row.estimated_arrival_local ?? row.scheduled_arrival_local,
    row.estimated_arrival_utc ?? row.scheduled_arrival_utc,
  );
}

function formatAirportBoardTime(localValue: string | null, utcValue: string | null) {
  if (localValue) {
    const parsed = parseAirportLocalDate(localValue);
    if (parsed) {
      return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(parsed);
    }
    return localValue;
  }

  return formatUtc(utcValue);
}

function parseAirportLocalDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)));
}
