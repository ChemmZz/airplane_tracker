const TOKEN_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";

type TokenCache = { token: string; expiresAt: number } | null;
let cache: TokenCache = null;

export async function getOpenSkyToken(): Promise<string> {
  const now = Date.now();
  if (cache && cache.expiresAt > now + 30_000) return cache.token;

  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("OpenSky OAuth credentials not configured");
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
    throw new Error(`OpenSky token request failed: ${res.status}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cache = {
    token: json.access_token,
    expiresAt: now + Math.max(60_000, (json.expires_in - 60) * 1000),
  };
  return cache.token;
}

export type OpenSkyStateArray = [
  string,       // 0 icao24
  string | null, // 1 callsign
  string,        // 2 origin_country
  number | null, // 3 time_position
  number,        // 4 last_contact
  number | null, // 5 longitude
  number | null, // 6 latitude
  number | null, // 7 baro_altitude
  boolean,       // 8 on_ground
  number | null, // 9 velocity
  number | null, // 10 true_track
  number | null, // 11 vertical_rate
  number[] | null, // 12 sensors
  number | null, // 13 geo_altitude
  string | null, // 14 squawk
  boolean,       // 15 spi
  number,        // 16 position_source
];

export type OpenSkyResponse = {
  time: number;
  states: OpenSkyStateArray[] | null;
};

export async function fetchStates(params: {
  lamin?: number;
  lomin?: number;
  lamax?: number;
  lomax?: number;
}): Promise<OpenSkyResponse> {
  const token = await getOpenSkyToken();
  const qs = new URLSearchParams();
  if (params.lamin !== undefined) qs.set("lamin", String(params.lamin));
  if (params.lomin !== undefined) qs.set("lomin", String(params.lomin));
  if (params.lamax !== undefined) qs.set("lamax", String(params.lamax));
  if (params.lomax !== undefined) qs.set("lomax", String(params.lomax));
  const url = `https://opensky-network.org/api/states/all${qs.size ? `?${qs}` : ""}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`OpenSky /states/all failed: ${res.status}`);
  }
  return (await res.json()) as OpenSkyResponse;
}

export function stateArrayToRow(s: OpenSkyStateArray, opts: { regionId?: string | null; source: "region" | "lookup" }) {
  const toIso = (unix: number | null | undefined) =>
    unix == null ? null : new Date(unix * 1000).toISOString();
  return {
    icao24: s[0],
    callsign: s[1]?.trim() || null,
    origin_country: s[2] ?? null,
    time_position: toIso(s[3] ?? null),
    last_contact: toIso(s[4]),
    longitude: s[5],
    latitude: s[6],
    baro_altitude: s[7],
    on_ground: s[8],
    velocity: s[9],
    true_track: s[10],
    vertical_rate: s[11],
    squawk: s[14],
    region_id: opts.regionId ?? null,
    last_seen_at: new Date().toISOString(),
    source: opts.source,
  };
}
