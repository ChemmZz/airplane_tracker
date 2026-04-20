import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchStates, stateArrayToRow } from "@/lib/opensky";
import { supabaseService } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const callsign = req.nextUrl.searchParams.get("callsign")?.trim().toUpperCase();
  if (!callsign) return new NextResponse("Missing callsign", { status: 400 });

  let data;
  try {
    data = await fetchStates({});
  } catch (err) {
    return new NextResponse(
      `OpenSky lookup failed: ${err instanceof Error ? err.message : "unknown"}`,
      { status: 502 },
    );
  }

  const match = (data.states ?? []).find(
    (s) => (s[1] ?? "").trim().toUpperCase() === callsign,
  );

  if (!match) {
    return NextResponse.json({ icao24: null, callsign });
  }

  const row = stateArrayToRow(match, { regionId: null, source: "lookup" });
  const sb = supabaseService();
  await sb.from("flights").upsert(row, { onConflict: "icao24" });

  return NextResponse.json({ icao24: row.icao24, callsign: row.callsign });
}
