type AirLabsEnvelope<T> = {
  response: T;
  error?: { message?: string; code?: string } | null;
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

export type AirLabsAirport = {
  name?: string | null;
  city?: string | null;
  iata_code?: string | null;
  icao_code?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type AirLabsSchedule = {
  airline_iata?: string | null;
  flight_iata?: string | null;
  flight_number?: string | null;
  dep_iata?: string | null;
  dep_icao?: string | null;
  dep_time?: string | null;
  dep_time_utc?: string | null;
  dep_estimated?: string | null;
  dep_estimated_utc?: string | null;
  arr_time?: string | null;
  arr_time_utc?: string | null;
  arr_estimated?: string | null;
  arr_estimated_utc?: string | null;
  arr_actual?: string | null;
  arr_actual_utc?: string | null;
  status?: string | null;
};

type AirLabsAirline = {
  name?: string | null;
  iata_code?: string | null;
};

function apiKey() {
  const key = process.env.AIRLABS_API_KEY;
  if (!key) throw new Error("Missing AIRLABS_API_KEY");
  return key;
}

async function airlabs<T>(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams({ ...params, api_key: apiKey() });
  const res = await fetch(`https://airlabs.co/api/v9/${path}?${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`AirLabs ${path} failed: ${res.status}`);
  const json = (await res.json()) as AirLabsEnvelope<T>;
  if (json.error) throw new Error(json.error.message ?? `AirLabs ${path} error`);
  return json.response;
}

export async function findFlightByCode(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) throw new Error("Missing flight code");

  const byIata = await airlabs<AirLabsFlight | null>("flight", { flight_iata: normalized }).catch(() => null);
  if (byIata?.flight_iata || byIata?.flight_icao) return byIata;

  const byIcao = await airlabs<AirLabsFlight | null>("flight", { flight_icao: normalized }).catch(() => null);
  if (byIcao?.flight_iata || byIcao?.flight_icao) return byIcao;

  return null;
}

export async function getAirportByCode(code: string | null | undefined) {
  if (!code) return null;
  const rows = await airlabs<AirLabsAirport[]>("airports", { iata_code: code });
  return rows[0] ?? null;
}

export async function getArrivalBoard(arrivalAirportIata: string, limit = 10) {
  const arrivalAirport = await getAirportByCode(arrivalAirportIata).catch(() => null);
  const schedules = await airlabs<AirLabsSchedule[]>("schedules", {
    arr_iata: arrivalAirportIata,
    limit: String(limit),
    _fields: [
      "airline_iata",
      "flight_iata",
      "flight_number",
      "dep_iata",
      "dep_icao",
      "dep_time",
      "dep_time_utc",
      "dep_estimated",
      "dep_estimated_utc",
      "arr_time",
      "arr_time_utc",
      "arr_estimated",
      "arr_estimated_utc",
      "arr_actual",
      "arr_actual_utc",
      "status",
    ].join(","),
  });

  const airlineCodes = [...new Set(schedules.map((s) => s.airline_iata).filter(Boolean))] as string[];
  const airlinePairs = await Promise.all(
    airlineCodes.map(async (code) => {
      const rows = await airlabs<AirLabsAirline[]>("airlines", {
        iata_code: code,
        _fields: "name,iata_code",
      }).catch(() => []);
      return [code, rows[0]?.name ?? code] as const;
    }),
  );
  const airlineNames = Object.fromEntries(airlinePairs);

  const originCodes = [...new Set(schedules.map((s) => s.dep_iata).filter(Boolean))] as string[];
  const originPairs = await Promise.all(
    originCodes.map(async (code) => {
      const airport = await getAirportByCode(code).catch(() => null);
      return [code, airport?.name ?? code] as const;
    }),
  );
  const originNames = Object.fromEntries(originPairs);

  return {
    airportCode: arrivalAirportIata,
    airportName: arrivalAirport?.name ?? arrivalAirportIata,
    rows: schedules.map((schedule) => ({
      airline_name: schedule.airline_iata ? airlineNames[schedule.airline_iata] ?? schedule.airline_iata : "Unknown",
      airline_iata: schedule.airline_iata ?? null,
      flight_iata: schedule.flight_iata ?? null,
      flight_number: schedule.flight_number ?? null,
      status: schedule.status ?? "scheduled",
      origin_code: schedule.dep_iata ?? schedule.dep_icao ?? "—",
      origin_name: schedule.dep_iata ? originNames[schedule.dep_iata] ?? schedule.dep_iata : schedule.dep_icao ?? "Unknown airport",
      scheduled_arrival_local: schedule.arr_time ?? null,
      scheduled_arrival_utc: schedule.arr_time_utc ?? null,
      estimated_arrival_local: schedule.arr_estimated ?? null,
      estimated_arrival_utc: schedule.arr_estimated_utc ?? null,
      actual_arrival_local: schedule.arr_actual ?? null,
      actual_arrival_utc: schedule.arr_actual_utc ?? null,
    })),
  };
}
