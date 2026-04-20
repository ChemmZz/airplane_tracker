import type { StateArray } from "./opensky.js";
import { supabase, type Region } from "./supabase.js";
import { log } from "./logger.js";

function toIso(unix: number | null | undefined): string | null {
  return unix == null ? null : new Date(unix * 1000).toISOString();
}

function toRow(s: StateArray, region: Region) {
  return {
    icao24: s[0],
    callsign: s[1]?.trim() || null,
    origin_country: s[2] ?? null,
    time_position: toIso(s[3]),
    last_contact: toIso(s[4]),
    longitude: s[5],
    latitude: s[6],
    baro_altitude: s[7],
    on_ground: s[8],
    velocity: s[9],
    true_track: s[10],
    vertical_rate: s[11],
    squawk: s[14],
    region_id: region.id,
    last_seen_at: new Date().toISOString(),
    source: "region" as const,
  };
}

export async function upsertRegionStates(region: Region, states: StateArray[]) {
  if (states.length === 0) {
    log.info(`[${region.slug}] no states`);
    return;
  }

  const rows = states.map((s) => toRow(s, region));
  // Chunk at 500 to stay under request size limits.
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase()
      .from("flights")
      .upsert(chunk, { onConflict: "icao24" });
    if (error) {
      log.error(`[${region.slug}] upsert chunk ${i} failed:`, error.message);
      return;
    }
  }
  log.info(`[${region.slug}] upserted ${rows.length} flights`);
}
