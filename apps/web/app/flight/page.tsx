import { auth } from "@clerk/nextjs/server";
import { FloatingTutorial } from "@/components/FloatingTutorial";
import { LivePauseWarning } from "@/components/LivePauseWarning";
import { getUserLiveRegionStatus } from "@/lib/live-region-server";
import { FlightSearchForm } from "./flight-search-form";

export const dynamic = "force-dynamic";

export default async function FlightSearchPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const liveRegion = await getUserLiveRegionStatus();

  return (
    <>
      <div className="mx-auto max-w-xl space-y-6 py-8">
        <div>
          <h1 className="text-2xl font-bold">Flight lookup</h1>
          <p className="mt-1 text-slate-400">
            Enter an ICAO callsign (e.g. <span className="font-mono">UAL123</span>,{" "}
            <span className="font-mono">DLH400</span>) to pull the latest position from OpenSky.
          </p>
        </div>
        {liveRegion?.is_paused ? <LivePauseWarning /> : null}
        <FlightSearchForm />
      </div>
      <FloatingTutorial
        title="How Lookup Works"
        steps={[
          "Save up to three regions, then choose one live region to keep freshest.",
          "Pause live updates whenever you want to work on layouts without spending more polling credits.",
          "Use lookup for an on-demand callsign search, then resume live updates when you want the freshest stream again.",
        ]}
      />
    </>
  );
}
