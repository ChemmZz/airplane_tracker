"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function FlightSearchPage() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const callsign = value.trim().toUpperCase();
    if (!callsign) return;
    router.push(`/flight/${encodeURIComponent(callsign)}`);
  }

  return (
    <div className="mx-auto max-w-xl py-8">
      <h1 className="text-2xl font-bold">Flight lookup</h1>
      <p className="mt-1 text-slate-400">
        Enter an ICAO callsign (e.g. <span className="font-mono">UAL123</span>,{" "}
        <span className="font-mono">DLH400</span>) to pull the latest position from OpenSky.
      </p>
      <form onSubmit={submit} className="mt-6 flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="CALLSIGN"
          className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 font-mono uppercase tracking-wider outline-none focus:border-sky-500"
        />
        <button
          type="submit"
          className="rounded-md bg-sky-500 px-4 py-2 font-medium text-white hover:bg-sky-400"
        >
          Track
        </button>
      </form>
    </div>
  );
}
