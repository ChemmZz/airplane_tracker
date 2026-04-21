import { resolve } from "node:path";
import { CONFIG } from "./config.js";
import { fetchFlight } from "./airlabs.js";
import { deriveLeaveByUtc, buildNotificationEvents, recordAndSendNotifications, type TrackedFlightRow } from "./notifications.js";
import { log } from "./logger.js";
import { supabase } from "./supabase.js";

(process as NodeJS.Process & { loadEnvFile?: (path?: string) => void }).loadEnvFile?.(
  resolve(process.cwd(), ".env.local"),
);

async function loadTrackedFlights(): Promise<TrackedFlightRow[]> {
  const { data, error } = await supabase()
    .from("tracked_flights")
    .select("*")
    .order("updated_at", { ascending: true });
  if (error) throw new Error(`Load tracked flights: ${error.message}`);
  return (data ?? []) as TrackedFlightRow[];
}

async function pollTrackedFlight(previous: TrackedFlightRow) {
  try {
    const live = await fetchFlight({
      flight_iata: previous.flight_iata,
      flight_icao: previous.flight_icao,
    });

    const next: Partial<TrackedFlightRow> = {
      flight_iata: live?.flight_iata ?? previous.flight_iata,
      flight_icao: live?.flight_icao ?? previous.flight_icao,
      status: live?.status ?? previous.status,
      dep_delayed: live?.dep_delayed ?? previous.dep_delayed,
      arr_delayed: live?.arr_delayed ?? previous.arr_delayed,
      dep_estimated_utc: live?.dep_estimated_utc ?? previous.dep_estimated_utc,
      dep_time_utc: live?.dep_time_utc ?? previous.dep_time_utc,
      arr_estimated_utc: live?.arr_estimated_utc ?? previous.arr_estimated_utc,
      arr_time_utc: live?.arr_time_utc ?? previous.arr_time_utc,
      dep_gate: live?.dep_gate ?? null,
      dep_terminal: live?.dep_terminal ?? null,
      arr_gate: live?.arr_gate ?? null,
      arr_terminal: live?.arr_terminal ?? null,
      arr_baggage: live?.arr_baggage ?? null,
      hex: live?.hex ?? previous.hex,
      reg_number: live?.reg_number ?? previous.reg_number,
      lat: live?.lat ?? previous.lat,
      lng: live?.lng ?? previous.lng,
      alt: live?.alt ?? previous.alt,
      dir: live?.dir ?? previous.dir,
      speed: live?.speed ?? previous.speed,
      v_speed: live?.v_speed ?? previous.v_speed,
      aircraft_icao: live?.aircraft_icao ?? previous.aircraft_icao,
      aircraft_model: live?.model ?? previous.aircraft_model,
      airline_iata: live?.airline_iata ?? previous.airline_iata,
      airline_icao: live?.airline_icao ?? previous.airline_icao,
      flight_number: live?.flight_number ?? previous.flight_number,
      last_signal_at: live?.updated ? new Date(live.updated * 1000).toISOString() : previous.last_signal_at,
      last_polled_at: new Date().toISOString(),
      last_error: null,
    };

    const current = {
      ...previous,
      ...next,
      leave_by_utc: deriveLeaveByUtc({
        arr_estimated_utc: next.arr_estimated_utc ?? previous.arr_estimated_utc,
        arr_time_utc: next.arr_time_utc ?? previous.arr_time_utc,
        drive_duration_minutes: previous.drive_duration_minutes,
        pickup_buffer_minutes: previous.pickup_buffer_minutes,
      }),
    } as TrackedFlightRow;

    if (current.leave_by_utc) {
      const now = Date.now();
      const leaveBy = new Date(current.leave_by_utc).getTime();
      const soonAt = leaveBy - CONFIG.leaveSoonLeadMinutes * 60_000;
      current.leave_stage = now >= leaveBy ? "now" : now >= soonAt ? "soon" : "idle";
    } else {
      current.leave_stage = "idle";
    }

    const events = buildNotificationEvents(previous, current);
    const { error } = await supabase()
      .from("tracked_flights")
      .update(current)
      .eq("clerk_user_id", previous.clerk_user_id);
    if (error) throw new Error(error.message);

    await recordAndSendNotifications(current, events);
    log.info(`[${current.flight_iata}] poll ok (${current.status ?? "unknown"})`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    await supabase()
      .from("tracked_flights")
      .update({ last_polled_at: new Date().toISOString(), last_error: message })
      .eq("clerk_user_id", previous.clerk_user_id);
    log.error(`[${previous.flight_iata}] poll failed: ${message}`);
  }
}

async function main() {
  log.info("pickup assistant worker starting");
  let idx = 0;

  const tick = async () => {
    const trackedFlights = await loadTrackedFlights();
    if (trackedFlights.length === 0) {
      log.info("no tracked flights");
      return;
    }

    const flight = trackedFlights[idx % trackedFlights.length];
    idx += 1;
    await pollTrackedFlight(flight);
  };

  const timer = setInterval(() => {
    void tick();
  }, CONFIG.pollIntervalMs);

  void tick();

  const shutdown = (signal: string) => {
    log.info(`received ${signal}, shutting down`);
    clearInterval(timer);
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  log.error("fatal:", err);
  process.exit(1);
});
