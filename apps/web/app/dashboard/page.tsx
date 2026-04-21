import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { FloatingTutorial } from "@/components/FloatingTutorial";
import { getRecentNotificationEvents, getTrackedFlightForUser } from "@/lib/tracked-flight-server";
import { TrackedFlightLiveView } from "./tracked-flight-live-view";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const [trackedFlight, events] = await Promise.all([
    getTrackedFlightForUser(),
    getRecentNotificationEvents(),
  ]);

  if (!trackedFlight) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-dashed border-slate-700 p-10 text-center">
        <h1 className="text-3xl font-bold">No flight selected yet</h1>
        <p className="mt-3 text-slate-400">
          Track one flight, then this dashboard will tell you when to leave, email you about major changes, and show the aircraft live when position data is available.
        </p>
        <Link
          href="/flight"
          className="mt-6 inline-block rounded-md bg-sky-500 px-5 py-2.5 font-medium text-white hover:bg-sky-400"
        >
          Choose a flight
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-300">Pickup assistant</p>
            <h1 className="mt-1 text-3xl font-bold">Plan your airport pickup</h1>
            <p className="mt-2 max-w-3xl text-slate-400">
              Your worker watches this flight, updates it in Supabase in real time, and emails you when the trip changes or when it is time to head out.
            </p>
          </div>
          <Link href="/flight" className="text-sm text-sky-300 hover:underline">
            Change tracked flight
          </Link>
        </div>
        <TrackedFlightLiveView initialFlight={trackedFlight} initialEvents={events} />
      </div>
      <FloatingTutorial
        title="How The Pickup Assistant Works"
        steps={[
          "Enter one flight number to make it your active tracked flight.",
          "The worker polls AirLabs, writes updates into Supabase, and this dashboard updates live without refreshing.",
          "Use your browser location to calculate the drive to the arrival airport and get a recommended time to leave.",
        ]}
      />
    </>
  );
}
