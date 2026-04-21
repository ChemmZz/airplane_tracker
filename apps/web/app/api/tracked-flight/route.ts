import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { findFlightByCode, getAirportByCode } from "@/lib/airlabs";
import { supabaseForUser } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { flightCode, notificationEmail } = (await req.json()) as {
    flightCode?: string;
    notificationEmail?: string;
  };

  const code = flightCode?.trim().toUpperCase();
  if (!code || !notificationEmail) {
    return new NextResponse("Missing flightCode or notificationEmail", { status: 400 });
  }

  const flight = await findFlightByCode(code);
  if (!flight) {
    return new NextResponse(`No AirLabs flight found for ${code}`, { status: 404 });
  }

  const [depAirport, arrAirport] = await Promise.all([
    getAirportByCode(flight.dep_iata),
    getAirportByCode(flight.arr_iata),
  ]);

  const supabase = await supabaseForUser();
  const { error } = await supabase.from("tracked_flights").upsert({
    clerk_user_id: userId,
    notification_email: notificationEmail,
    flight_iata: flight.flight_iata ?? code,
    flight_icao: flight.flight_icao ?? null,
    airline_iata: flight.airline_iata ?? null,
    airline_icao: flight.airline_icao ?? null,
    flight_number: flight.flight_number ?? null,
    dep_iata: flight.dep_iata ?? null,
    dep_icao: flight.dep_icao ?? null,
    dep_name: depAirport?.name ?? null,
    dep_city: depAirport?.city ?? null,
    dep_lat: depAirport?.lat ?? null,
    dep_lng: depAirport?.lng ?? null,
    arr_iata: flight.arr_iata ?? null,
    arr_icao: flight.arr_icao ?? null,
    arr_name: arrAirport?.name ?? null,
    arr_city: arrAirport?.city ?? null,
    arr_lat: arrAirport?.lat ?? null,
    arr_lng: arrAirport?.lng ?? null,
    aircraft_icao: flight.aircraft_icao ?? null,
    aircraft_model: flight.model ?? null,
    status: flight.status ?? null,
    hex: flight.hex ?? null,
    reg_number: flight.reg_number ?? null,
    lat: flight.lat ?? null,
    lng: flight.lng ?? null,
    alt: flight.alt ?? null,
    dir: flight.dir ?? null,
    speed: flight.speed ?? null,
    v_speed: flight.v_speed ?? null,
    dep_time_utc: flight.dep_time_utc ?? null,
    dep_estimated_utc: flight.dep_estimated_utc ?? null,
    arr_time_utc: flight.arr_time_utc ?? null,
    arr_estimated_utc: flight.arr_estimated_utc ?? null,
    dep_delayed: flight.dep_delayed ?? null,
    arr_delayed: flight.arr_delayed ?? null,
    dep_gate: flight.dep_gate ?? null,
    dep_terminal: flight.dep_terminal ?? null,
    arr_gate: flight.arr_gate ?? null,
    arr_terminal: flight.arr_terminal ?? null,
    arr_baggage: flight.arr_baggage ?? null,
    last_signal_at: flight.updated ? new Date(flight.updated * 1000).toISOString() : null,
    last_polled_at: new Date().toISOString(),
    last_error: null,
  }, { onConflict: "clerk_user_id" });

  if (error) return new NextResponse(error.message, { status: 500 });
  return NextResponse.json({ ok: true, flight_iata: flight.flight_iata ?? code });
}
