type AirLabsEnvelope<T> = {
  response: T;
  error?: { message?: string; code?: string } | null;
};

export class AirLabsApiError extends Error {
  constructor(
    message: string,
    public readonly apiCode?: string | null,
  ) {
    super(message);
    this.name = "AirLabsApiError";
  }
}

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

const airportCache = new Map<string, Promise<AirLabsAirport | null>>();
const ARRIVAL_BOARD_TTL_MS = 5 * 60_000;

type ArrivalBoardRow = {
  airline_name: string;
  airline_iata: string | null;
  flight_iata: string | null;
  flight_number: string | null;
  status: string;
  origin_code: string;
  origin_name: string;
  scheduled_arrival_local: string | null;
  scheduled_arrival_utc: string | null;
  estimated_arrival_local: string | null;
  estimated_arrival_utc: string | null;
  actual_arrival_local: string | null;
  actual_arrival_utc: string | null;
};

type ArrivalBoardData = {
  airportCode: string;
  airportName: string;
  rows: ArrivalBoardRow[];
};

const arrivalBoardCache = new Map<
  string,
  {
    expiresAt: number;
    value?: ArrivalBoardData;
    error?: Error;
  }
>();

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
  if (json.error) throw new AirLabsApiError(json.error.message ?? `AirLabs ${path} error`, json.error.code ?? null);
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
  const normalized = code.trim().toUpperCase();
  const existing = airportCache.get(normalized);
  if (existing) return existing;

  const pending = airlabs<AirLabsAirport[]>("airports", { iata_code: normalized })
    .then((rows) => rows[0] ?? null)
    .catch((error) => {
      airportCache.delete(normalized);
      throw error;
    });
  airportCache.set(normalized, pending);
  return pending;
}

export async function getArrivalBoard(arrivalAirportIata: string, limit = 10) {
  const normalizedAirport = arrivalAirportIata.trim().toUpperCase();
  const cacheKey = `${normalizedAirport}:${limit}`;
  const now = Date.now();
  const cached = arrivalBoardCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    if (cached.error) throw cached.error;
    if (cached.value) return cached.value;
  }

  try {
    const schedules = await airlabs<AirLabsSchedule[]>("schedules", {
      arr_iata: normalizedAirport,
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

    const result: ArrivalBoardData = {
      airportCode: normalizedAirport,
      airportName: normalizedAirport,
      rows: schedules.map((schedule) => {
        const originCode = schedule.dep_iata ?? schedule.dep_icao ?? "—";
        return {
          airline_name: schedule.airline_iata ?? "Unknown",
          airline_iata: schedule.airline_iata ?? null,
          flight_iata: schedule.flight_iata ?? null,
          flight_number: schedule.flight_number ?? null,
          status: schedule.status ?? "scheduled",
          origin_code: originCode,
          origin_name: originCode,
          scheduled_arrival_local: schedule.arr_time ?? null,
          scheduled_arrival_utc: schedule.arr_time_utc ?? null,
          estimated_arrival_local: schedule.arr_estimated ?? null,
          estimated_arrival_utc: schedule.arr_estimated_utc ?? null,
          actual_arrival_local: schedule.arr_actual ?? null,
          actual_arrival_utc: schedule.arr_actual_utc ?? null,
        };
      }),
    };

    arrivalBoardCache.set(cacheKey, {
      expiresAt: now + ARRIVAL_BOARD_TTL_MS,
      value: result,
    });
    return result;
  } catch (error) {
    const nextError = error instanceof Error ? error : new Error("Unknown arrival board error");
    arrivalBoardCache.set(cacheKey, {
      expiresAt: now + ARRIVAL_BOARD_TTL_MS,
      error: nextError,
    });
    throw nextError;
  }
}
