import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { FloatingTutorial } from "@/components/FloatingTutorial";
import { getArrivalBoard } from "@/lib/airlabs";
import { getTrackedFlightForUser } from "@/lib/tracked-flight-server";
import { ArrivalBoard } from "./arrival-board";
import { TrackFlightForm } from "./track-flight-form";

export const dynamic = "force-dynamic";

export default async function FlightPage({
  searchParams,
}: {
  searchParams?: Promise<{ code?: string; airport?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const params = (await searchParams) ?? {};
  const trackedFlight = await getTrackedFlightForUser();
  const airportCode = (params.airport ?? trackedFlight?.arr_iata ?? "ORD").toUpperCase();
  const arrivalBoard = await getArrivalBoard(airportCode, 10).catch(() => ({
    airportCode,
    airportName: airportCode,
    rows: [],
  }));

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-6 py-8">
        <div>
          <h1 className="text-3xl font-bold">Track a flight</h1>
          <p className="mt-2 text-slate-400">
            Enter a flight IATA or ICAO code. We will watch that flight, estimate your drive to the arrival airport, and surface major updates in the app.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[0.9fr,1.7fr]">
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-300">Flight number</p>
              <div className="mt-3">
                <TrackFlightForm initialCode={params.code ?? ""} />
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-300">Arrival board airport</p>
              <form className="mt-3 flex gap-2" action="/flight">
                <input
                  type="text"
                  name="airport"
                  defaultValue={airportCode}
                  maxLength={3}
                  className="w-24 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 font-mono uppercase tracking-wider outline-none focus:border-sky-500"
                />
                <button
                  type="submit"
                  className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
                >
                  Load arrivals
                </button>
              </form>
              <p className="mt-3 text-sm text-slate-400">
                Use any arrival airport IATA code, for example <span className="font-mono">ORD</span>, <span className="font-mono">MDW</span>, or <span className="font-mono">MEX</span>.
              </p>
            </div>
          </div>
          <ArrivalBoard
            airportCode={arrivalBoard.airportCode}
            airportName={arrivalBoard.airportName}
            rows={arrivalBoard.rows}
          />
        </div>
        {trackedFlight ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">Currently tracked</p>
            <h2 className="mt-2 text-xl font-semibold text-white">
              {trackedFlight.flight_iata} {trackedFlight.dep_iata ?? "???"} → {trackedFlight.arr_iata ?? "???"}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Status: {trackedFlight.status ?? "pending"} · Notifications stay in your dashboard feed
            </p>
            <Link href="/dashboard" className="mt-4 inline-block text-sm text-sky-300 hover:underline">
              Open dashboard
            </Link>
          </div>
        ) : null}
      </div>
      <FloatingTutorial
        title="Track One Flight"
        steps={[
          "Use one active flight at a time for the pickup scenario.",
          "After you save the flight, the background worker keeps polling AirLabs for status and position changes.",
          "Use the arrivals board for quick selection, then open the dashboard to update your location and get the drive-to-airport leave time.",
        ]}
      />
    </>
  );
}
