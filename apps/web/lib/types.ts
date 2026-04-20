export type Region = {
  id: string;
  slug: string;
  name: string;
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
};

export type Flight = {
  icao24: string;
  callsign: string | null;
  origin_country: string | null;
  longitude: number | null;
  latitude: number | null;
  baro_altitude: number | null;
  velocity: number | null;
  true_track: number | null;
  vertical_rate: number | null;
  on_ground: boolean | null;
  squawk: string | null;
  region_id: string | null;
  time_position: string | null;
  last_contact: string | null;
  last_seen_at: string;
  source: "region" | "lookup";
};

export type UserFavorite = {
  clerk_user_id: string;
  region_id: string;
  created_at: string;
};
