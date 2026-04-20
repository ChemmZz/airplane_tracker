import Link from "next/link";
import { FlightLiveView } from "./flight-live-view";

export const dynamic = "force-dynamic";

export default async function FlightPage({
  params,
}: {
  params: Promise<{ callsign: string }>;
}) {
  const { callsign } = await params;
  const normalized = decodeURIComponent(callsign).toUpperCase();

  return (
    <div className="space-y-4">
      <div>
        <Link href="/flight" className="text-sm text-sky-300 hover:underline">
          ← new lookup
        </Link>
        <h1 className="mt-1 text-2xl font-bold">
          Tracking <span className="font-mono">{normalized}</span>
        </h1>
      </div>
      <FlightLiveView callsign={normalized} />
    </div>
  );
}
