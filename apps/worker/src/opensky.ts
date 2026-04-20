import { CONFIG } from "./config.js";
import { log } from "./logger.js";

const TOKEN_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";
const STATES_URL = "https://opensky-network.org/api/states/all";

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + CONFIG.tokenSafetyMs) {
    return tokenCache.token;
  }

  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing OPENSKY_CLIENT_ID / OPENSKY_CLIENT_SECRET");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new Error(`OpenSky token ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: json.access_token,
    expiresAt: now + (json.expires_in - 60) * 1000,
  };
  log.info(`OAuth token refreshed (expires in ${json.expires_in}s)`);
  return tokenCache.token;
}

export type StateArray = [
  string,        // 0  icao24
  string | null, // 1  callsign (space-padded)
  string,        // 2  origin_country
  number | null, // 3  time_position (unix)
  number,        // 4  last_contact (unix)
  number | null, // 5  longitude
  number | null, // 6  latitude
  number | null, // 7  baro_altitude
  boolean,       // 8  on_ground
  number | null, // 9  velocity (m/s)
  number | null, // 10 true_track (deg)
  number | null, // 11 vertical_rate
  number[] | null, // 12 sensors
  number | null, // 13 geo_altitude
  string | null, // 14 squawk
  boolean,       // 15 spi
  number,        // 16 position_source
];

export type StatesResponse = {
  time: number;
  states: StateArray[] | null;
};

export async function fetchStates(bbox: {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
}): Promise<StatesResponse> {
  const token = await getToken();
  const qs = new URLSearchParams({
    lamin: String(bbox.lamin),
    lomin: String(bbox.lomin),
    lamax: String(bbox.lamax),
    lomax: String(bbox.lomax),
  });
  const res = await fetch(`${STATES_URL}?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`OpenSky /states/all ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as StatesResponse;
}
