import type { TrackedFlight } from "@/lib/types";

export function formatUtc(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function resolveArrivalMoment(flight: TrackedFlight) {
  return flight.arr_estimated_utc ?? flight.arr_time_utc ?? null;
}

export function computeLeaveSummary(flight: TrackedFlight) {
  const arrival = resolveArrivalMoment(flight);
  if (!arrival || flight.drive_duration_minutes == null) {
    return { leaveBy: null as Date | null, shouldLeave: false };
  }

  const arrivalTime = new Date(arrival).getTime();
  const leaveBy = new Date(
    arrivalTime + flight.pickup_buffer_minutes * 60_000 - flight.drive_duration_minutes * 60_000,
  );
  return { leaveBy, shouldLeave: Date.now() >= leaveBy.getTime() };
}
