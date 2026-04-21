import { supabase } from "./supabase.js";
import { CONFIG } from "./config.js";
import { log } from "./logger.js";

export type TrackedFlightRow = {
  clerk_user_id: string;
  notification_email: string;
  flight_iata: string;
  flight_icao: string | null;
  airline_iata: string | null;
  airline_icao: string | null;
  flight_number: string | null;
  status: string | null;
  hex: string | null;
  reg_number: string | null;
  lat: number | null;
  lng: number | null;
  alt: number | null;
  dir: number | null;
  speed: number | null;
  v_speed: number | null;
  aircraft_icao: string | null;
  aircraft_model: string | null;
  dep_delayed: number | null;
  arr_delayed: number | null;
  dep_gate: string | null;
  dep_terminal: string | null;
  arr_gate: string | null;
  arr_terminal: string | null;
  arr_baggage: string | null;
  arr_city: string | null;
  arr_name: string | null;
  arr_estimated_utc: string | null;
  arr_time_utc: string | null;
  dep_estimated_utc: string | null;
  dep_time_utc: string | null;
  drive_duration_minutes: number | null;
  pickup_buffer_minutes: number;
  leave_by_utc: string | null;
  leave_stage: "idle" | "soon" | "now" | "sent";
  email_notifications: boolean;
  last_polled_at: string | null;
  last_signal_at: string | null;
  last_error: string | null;
};

type EventDraft = {
  eventKey: string;
  eventType: string;
  subject: string;
  body: string;
};

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toUTCString() : "unknown time";
}

function resolveArrivalUtc(flight: Pick<TrackedFlightRow, "arr_estimated_utc" | "arr_time_utc">) {
  return flight.arr_estimated_utc ?? flight.arr_time_utc ?? null;
}

export function deriveLeaveByUtc(flight: Pick<TrackedFlightRow, "arr_estimated_utc" | "arr_time_utc" | "drive_duration_minutes" | "pickup_buffer_minutes">) {
  const arrival = resolveArrivalUtc(flight);
  if (!arrival || flight.drive_duration_minutes == null) return null;
  return new Date(
    new Date(arrival).getTime() +
      flight.pickup_buffer_minutes * 60_000 -
      flight.drive_duration_minutes * 60_000,
  ).toISOString();
}

export function buildNotificationEvents(previous: TrackedFlightRow | null, current: TrackedFlightRow): EventDraft[] {
  if (!current.email_notifications) return [];

  const events: EventDraft[] = [];
  if (current.status && current.status !== previous?.status) {
    events.push({
      eventKey: `status:${current.status}:${current.arr_estimated_utc ?? current.dep_estimated_utc ?? "na"}`,
      eventType: "status-change",
      subject: `${current.flight_iata} is now ${current.status}`,
      body: `${current.flight_iata} changed to ${current.status}. Latest estimated arrival is ${formatDate(resolveArrivalUtc(current))}.`,
    });
  }

  if (current.dep_delayed != null && current.dep_delayed !== previous?.dep_delayed) {
    events.push({
      eventKey: `dep-delay:${current.dep_delayed}`,
      eventType: "departure-delay",
      subject: `${current.flight_iata} departure delay changed`,
      body: `${current.flight_iata} is now showing a departure delay of ${current.dep_delayed} minutes.`,
    });
  }

  if (current.arr_delayed != null && current.arr_delayed !== previous?.arr_delayed) {
    events.push({
      eventKey: `arr-delay:${current.arr_delayed}`,
      eventType: "arrival-delay",
      subject: `${current.flight_iata} arrival delay changed`,
      body: `${current.flight_iata} is now showing an arrival delay of ${current.arr_delayed} minutes.`,
    });
  }

  const leaveBy = current.leave_by_utc ? new Date(current.leave_by_utc).getTime() : null;
  if (leaveBy != null) {
    const soonAt = leaveBy - CONFIG.leaveSoonLeadMinutes * 60_000;
    const now = Date.now();
    if (now >= soonAt && now < leaveBy && previous?.leave_stage !== "soon" && previous?.leave_stage !== "now" && previous?.leave_stage !== "sent") {
      events.push({
        eventKey: `leave-soon:${current.leave_by_utc}`,
        eventType: "leave-soon",
        subject: `You should plan to leave soon for ${current.flight_iata}`,
        body: `Driving to ${current.arr_name ?? current.arr_city ?? "the airport"} currently takes about ${current.drive_duration_minutes ?? "?"} minutes. Aim to leave by ${formatDate(current.leave_by_utc)}.`,
      });
    }
    if (now >= leaveBy && previous?.leave_stage !== "now" && previous?.leave_stage !== "sent") {
      events.push({
        eventKey: `leave-now:${current.leave_by_utc}`,
        eventType: "leave-now",
        subject: `Time to leave for ${current.flight_iata}`,
        body: `It is time to leave for ${current.arr_name ?? current.arr_city ?? "the airport"}. Current drive estimate: ${current.drive_duration_minutes ?? "?"} minutes.`,
      });
    }
  }

  return events;
}

async function sendEmail(to: string, subject: string, body: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    log.warn("Skipping email because RESEND_API_KEY or RESEND_FROM_EMAIL is missing");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text: body,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend failed ${res.status}: ${await res.text()}`);
  }
}

export async function recordAndSendNotifications(flight: TrackedFlightRow, events: EventDraft[]) {
  for (const event of events) {
    const { data: existing } = await supabase()
      .from("notification_events")
      .select("id")
      .eq("clerk_user_id", flight.clerk_user_id)
      .eq("event_key", event.eventKey)
      .maybeSingle();

    if (existing) continue;

    await sendEmail(flight.notification_email, event.subject, event.body);

    const { error } = await supabase().from("notification_events").insert({
      clerk_user_id: flight.clerk_user_id,
      event_key: event.eventKey,
      event_type: event.eventType,
      subject: event.subject,
      body: event.body,
      payload: {
        flight_iata: flight.flight_iata,
        leave_by_utc: flight.leave_by_utc,
      },
    });

    if (error) {
      log.error("Failed to insert notification event", error.message);
    }
  }
}
