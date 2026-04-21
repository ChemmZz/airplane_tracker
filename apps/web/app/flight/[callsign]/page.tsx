import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { FloatingTutorial } from "@/components/FloatingTutorial";
import { LivePauseWarning } from "@/components/LivePauseWarning";
import { getUserLiveRegionStatus } from "@/lib/live-region-server";
import { FlightLiveView } from "./flight-live-view";

export const dynamic = "force-dynamic";

export default async function FlightPage({
  params,
}: {
  params: Promise<{ callsign: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const { callsign } = await params;
  const normalized = decodeURIComponent(callsign).toUpperCase();
  const liveRegion = await getUserLiveRegionStatus();

  return (
    <>
      <div className="space-y-4">
        <div>
          <Link href="/flight" className="text-sm text-sky-300 hover:underline">
            ← new lookup
          </Link>
          <h1 className="mt-1 text-2xl font-bold">
            Tracking <span className="font-mono">{normalized}</span>
          </h1>
        </div>
        {liveRegion?.is_paused ? <LivePauseWarning showResumeHint={false} /> : null}
        <FlightLiveView callsign={normalized} />
      </div>
      <FloatingTutorial
        title="How Lookup Works"
        steps={[
          "Lookup makes an on-demand OpenSky request for this callsign and writes the latest match into your flight cache.",
          "Your dashboard live region is the only saved region that gets priority polling.",
          "If live updates are paused, resume them when you want the freshest ongoing movement after this lookup.",
        ]}
      />
    </>
  );
}
