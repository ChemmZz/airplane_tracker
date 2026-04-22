"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useUser } from "@clerk/nextjs";
import { TrackedFlightMap } from "@/components/TrackedFlightMap";
import { useSupabase } from "@/lib/supabase-browser";
import { computeLeaveSummary, formatDisplayStatus, formatUtc, normalizeDisplayStatus, resolveArrivalEstimateUtc } from "@/lib/tracked-flight";
import type { NotificationEvent, TrackedFlight } from "@/lib/types";

export function TrackedFlightLiveView({
  initialFlight,
  initialEvents,
}: {
  initialFlight: TrackedFlight;
  initialEvents: NotificationEvent[];
}) {
  const supabase = useSupabase();
  const { user } = useUser();
  const [flight, setFlight] = useState(initialFlight);
  const [events, setEvents] = useState(initialEvents);
  const [routeMessage, setRouteMessage] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isUpdatingRoute, startTransition] = useTransition();

  useEffect(() => {
    if (!user) return;
    const flightChannel = supabase
      .channel(`tracked-flight:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tracked_flights", filter: `clerk_user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          setFlight(payload.new as TrackedFlight);
        },
      )
      .subscribe();

    const eventChannel = supabase
      .channel(`notification-events:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notification_events", filter: `clerk_user_id=eq.${user.id}` },
        (payload) => {
          const event = payload.new as NotificationEvent;
          setEvents((prev) => [event, ...prev.filter((item) => item.id !== event.id)].slice(0, 6));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(flightChannel);
      supabase.removeChannel(eventChannel);
    };
  }, [supabase, user]);

  const leaveSummary = useMemo(() => computeLeaveSummary(flight), [flight]);
  const displayStatus = normalizeDisplayStatus({
    status: flight.status,
    depDelayed: flight.dep_delayed,
    arrDelayed: flight.arr_delayed,
  });
  const leaveStatus = leaveSummary.leaveBy
    ? leaveSummary.shouldLeave
      ? { label: "Leave now", tone: "bg-rose-500/20 text-rose-200" }
      : { label: "On track", tone: "bg-emerald-500/20 text-emerald-200" }
    : { label: "Route needed", tone: "bg-slate-700 text-slate-200" };

  function updateRoute() {
    if (!navigator.geolocation) {
      setRouteError("Your browser does not support location access.");
      return;
    }

    setRouteError(null);
    setRouteMessage("Getting your current location…");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        startTransition(async () => {
          const res = await fetch("/api/travel-plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              originLat: position.coords.latitude,
              originLng: position.coords.longitude,
              originLabel: "Current location",
            }),
          });

          if (!res.ok) {
            setRouteError(await res.text());
            setRouteMessage(null);
            return;
          }

          const body = (await res.json()) as {
            durationMinutes: number;
            distanceMeters: number;
            leaveByUtc: string | null;
          };
          setFlight((current) => ({
            ...current,
            origin_lat: position.coords.latitude,
            origin_lng: position.coords.longitude,
            origin_label: "Current location",
            drive_duration_minutes: body.durationMinutes,
            drive_distance_meters: body.distanceMeters,
            last_location_at: new Date().toISOString(),
            leave_by_utc: body.leaveByUtc,
            leave_stage: body.leaveByUtc ? "idle" : current.leave_stage,
          }));
          setRouteMessage(
            `Driving ETA updated: ${body.durationMinutes} min over ${Math.round(body.distanceMeters / 1000)} km.`,
          );
        });
      },
      (error) => {
        setRouteMessage(null);
        setRouteError(error.message);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.35fr,0.95fr]">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-300">Tracked flight</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">
                {flight.flight_iata} {flight.dep_iata ?? "???"} → {flight.arr_iata ?? "???"}
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                {flight.dep_name ?? "Departure airport"} to {flight.arr_name ?? "Arrival airport"}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusTone(displayStatus)}`}>
              {formatDisplayStatus(displayStatus)}
            </span>
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <Metric label="Departure estimate" value={formatUtc(flight.dep_estimated_utc ?? flight.dep_time_utc)} />
            <Metric
              label="Arrival estimate"
              value={formatUtc(
                resolveArrivalEstimateUtc({
                  arrEstimatedUtc: flight.arr_estimated_utc,
                  arrTimeUtc: flight.arr_time_utc,
                  arrDelayed: flight.arr_delayed,
                }),
              )}
            />
            <Metric label="Departure delay" value={flight.dep_delayed != null ? `${flight.dep_delayed} min` : "—"} />
            <Metric label="Arrival delay" value={flight.arr_delayed != null ? `${flight.arr_delayed} min` : "—"} />
            <Metric label="Arrival terminal" value={flight.arr_terminal ?? "—"} />
            <Metric label="Departure gate" value={flight.dep_gate ?? "—"} />
            <Metric label="Aircraft" value={flight.aircraft_model ?? flight.aircraft_icao ?? "—"} />
          </dl>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">Pickup timing</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-semibold text-white">
              Leave by{" "}
              <span className="text-emerald-300">
                {leaveSummary.leaveBy ? formatUtc(leaveSummary.leaveBy.toISOString()) : "Waiting for route ETA"}
              </span>
            </h3>
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${leaveStatus.tone}`}>{leaveStatus.label}</span>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            This is your actionable departure time based on your latest browser location, current driving ETA, and a {flight.pickup_buffer_minutes}-minute post-landing pickup buffer.
          </p>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            <p>Driving ETA: {flight.drive_duration_minutes != null ? `${flight.drive_duration_minutes} min` : "Not calculated yet"}</p>
            <p>Distance: {flight.drive_distance_meters != null ? `${Math.round(flight.drive_distance_meters / 1000)} km` : "—"}</p>
            <p>Last location sync: {formatUtc(flight.last_location_at)}</p>
          </div>
          <button
            type="button"
            onClick={updateRoute}
            className="mt-4 rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400"
            disabled={isUpdatingRoute}
          >
            {isUpdatingRoute ? "Updating…" : "Update driving ETA"}
          </button>
          {routeMessage ? <p className="mt-3 text-sm text-emerald-300">{routeMessage}</p> : null}
          {routeError ? <p className="mt-3 text-sm text-rose-300">{routeError}</p> : null}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.35fr,0.95fr]">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="h-96 overflow-hidden rounded-lg border border-slate-800">
            <TrackedFlightMap
              lat={flight.lat}
              lng={flight.lng}
              heading={flight.dir}
              label={`${flight.flight_iata} · ${flight.status ?? "unknown"}`}
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-300">Notification log</p>
          <div className="mt-4 space-y-3 text-sm">
            {events.length === 0 ? (
              <p className="text-slate-400">No notifications yet. Major flight changes and leave-time reminders will appear here.</p>
            ) : (
              events.map((event) => (
                <div key={event.id} className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                  <p className="font-medium text-white">{event.subject}</p>
                  <p className="mt-1 text-slate-400">{event.body}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">{formatUtc(event.sent_at)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
      <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-white">{value}</dd>
    </div>
  );
}

function statusTone(status: string) {
  if (status.includes("cancel")) return "bg-rose-500/20 text-rose-200";
  if (status.includes("delay")) return "bg-amber-400/20 text-amber-200";
  if (status.includes("land")) return "bg-slate-100/10 text-white";
  return "bg-sky-500/20 text-sky-200";
}
