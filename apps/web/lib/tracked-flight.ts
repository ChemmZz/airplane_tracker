import type { TrackedFlight } from "@/lib/types";

export function formatUtc(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function addMinutesToUtc(value: string | null | undefined, minutes: number | null | undefined) {
  if (!value || !minutes || minutes <= 0) return value ?? null;
  return new Date(new Date(value).getTime() + minutes * 60_000).toISOString();
}

export function normalizeDisplayStatus(params: {
  status: string | null | undefined;
  depDelayed?: number | null;
  arrDelayed?: number | null;
}) {
  const normalized = params.status?.trim().toLowerCase() ?? "scheduled";
  if (normalized.includes("cancel")) return "cancelled";
  if (normalized.includes("land")) return "landed";
  if ((params.arrDelayed ?? 0) > 0 || (params.depDelayed ?? 0) > 0) return "delayed";
  return normalized;
}

export function formatDisplayStatus(status: string) {
  return status
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function resolveArrivalEstimateUtc(params: {
  arrEstimatedUtc: string | null | undefined;
  arrTimeUtc: string | null | undefined;
  arrDelayed?: number | null;
}) {
  return params.arrEstimatedUtc ?? addMinutesToUtc(params.arrTimeUtc, params.arrDelayed) ?? params.arrTimeUtc ?? null;
}

export function resolveArrivalMoment(flight: TrackedFlight) {
  return resolveArrivalEstimateUtc({
    arrEstimatedUtc: flight.arr_estimated_utc,
    arrTimeUtc: flight.arr_time_utc,
    arrDelayed: flight.arr_delayed,
  });
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
