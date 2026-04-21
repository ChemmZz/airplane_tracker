import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDrivingRoute } from "@/lib/openroute";
import { computeLeaveSummary } from "@/lib/tracked-flight";
import { supabaseForUser } from "@/lib/supabase-server";
import type { TrackedFlight } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { originLat, originLng, originLabel } = (await req.json()) as {
    originLat?: number;
    originLng?: number;
    originLabel?: string;
  };

  if (typeof originLat !== "number" || typeof originLng !== "number") {
    return new NextResponse("Missing origin coordinates", { status: 400 });
  }

  const supabase = await supabaseForUser();
  const { data, error } = await supabase.from("tracked_flights").select("*").maybeSingle();
  if (error) return new NextResponse(error.message, { status: 500 });
  if (!data) return new NextResponse("No tracked flight found", { status: 404 });
  const flight = data as TrackedFlight;

  if (flight.arr_lat == null || flight.arr_lng == null) {
    return new NextResponse("Arrival airport coordinates are not available", { status: 400 });
  }

  const route = await getDrivingRoute({
    originLat,
    originLng,
    destinationLat: flight.arr_lat,
    destinationLng: flight.arr_lng,
  });

  const nextFlight: TrackedFlight = {
    ...flight,
    origin_lat: originLat,
    origin_lng: originLng,
    origin_label: originLabel ?? "Current location",
    drive_duration_minutes: route.durationMinutes,
    drive_distance_meters: route.distanceMeters,
    last_location_at: new Date().toISOString(),
  };
  const leaveSummary = computeLeaveSummary(nextFlight);

  const { error: updateError } = await supabase
    .from("tracked_flights")
    .update({
      origin_lat: originLat,
      origin_lng: originLng,
      origin_label: originLabel ?? "Current location",
      drive_duration_minutes: route.durationMinutes,
      drive_distance_meters: route.distanceMeters,
      last_location_at: new Date().toISOString(),
      leave_by_utc: leaveSummary.leaveBy?.toISOString() ?? null,
      leave_stage: leaveSummary.leaveBy ? (leaveSummary.shouldLeave ? "now" : "idle") : "idle",
      last_error: null,
    })
    .eq("clerk_user_id", userId);

  if (updateError) return new NextResponse(updateError.message, { status: 500 });
  return NextResponse.json({
    durationMinutes: route.durationMinutes,
    distanceMeters: route.distanceMeters,
    leaveByUtc: leaveSummary.leaveBy?.toISOString() ?? null,
  });
}
