import { log } from "./logger.js";

type AirLabsEnvelope<T> = {
  response: T;
  error?: { message?: string } | null;
};

export type AirLabsFlight = {
  hex?: string | null;
  reg_number?: string | null;
  aircraft_icao?: string | null;
  airline_iata?: string | null;
  airline_icao?: string | null;
  flight_number?: string | null;
  flight_iata?: string | null;
  flight_icao?: string | null;
  dep_iata?: string | null;
  dep_icao?: string | null;
  dep_terminal?: string | null;
  dep_gate?: string | null;
  dep_time_utc?: string | null;
  dep_estimated_utc?: string | null;
  arr_iata?: string | null;
  arr_icao?: string | null;
  arr_terminal?: string | null;
  arr_gate?: string | null;
  arr_baggage?: string | null;
  arr_time_utc?: string | null;
  arr_estimated_utc?: string | null;
  dep_delayed?: number | null;
  arr_delayed?: number | null;
  updated?: number | null;
  status?: string | null;
  lat?: number | null;
  lng?: number | null;
  alt?: number | null;
  dir?: number | null;
  speed?: number | null;
  v_speed?: number | null;
  model?: string | null;
};

function apiKey() {
  const key = process.env.AIRLABS_API_KEY;
  if (!key) throw new Error("Missing AIRLABS_API_KEY");
  return key;
}

async function airlabs<T>(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams({ ...params, api_key: apiKey() });
  const res = await fetch(`https://airlabs.co/api/v9/${path}?${qs}`);
  if (!res.ok) {
    throw new Error(`AirLabs ${path} ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as AirLabsEnvelope<T>;
  if (json.error) throw new Error(json.error.message ?? `AirLabs ${path} error`);
  return json.response;
}

export async function fetchFlight(code: { flight_iata?: string | null; flight_icao?: string | null }) {
  if (code.flight_iata) {
    const result = await airlabs<AirLabsFlight | null>("flight", { flight_iata: code.flight_iata }).catch(() => null);
    if (result?.flight_iata || result?.flight_icao) return result;
  }
  if (code.flight_icao) {
    const result = await airlabs<AirLabsFlight | null>("flight", { flight_icao: code.flight_icao }).catch(() => null);
    if (result?.flight_iata || result?.flight_icao) return result;
  }
  log.warn("AirLabs returned no active flight", code);
  return null;
}
