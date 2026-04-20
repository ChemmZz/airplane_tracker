import { fetchStates } from "./opensky.js";
import { supabase, type Region } from "./supabase.js";
import { upsertRegionStates } from "./upsert.js";
import { cleanupStaleFlights } from "./cleanup.js";
import { CONFIG } from "./config.js";
import { log } from "./logger.js";

async function loadRegions(): Promise<Region[]> {
  const { data, error } = await supabase().from("regions").select("*").order("slug");
  if (error) throw new Error(`Load regions: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error("No regions in DB — run the seed migration first");
  }
  return data as Region[];
}

async function pollRegion(region: Region) {
  const started = Date.now();
  try {
    const data = await fetchStates({
      lamin: region.lamin,
      lomin: region.lomin,
      lamax: region.lamax,
      lomax: region.lomax,
    });
    const states = data.states ?? [];
    await upsertRegionStates(region, states);
    log.info(`[${region.slug}] poll ok in ${Date.now() - started}ms (${states.length} states)`);
  } catch (err) {
    log.error(`[${region.slug}] poll failed:`, err instanceof Error ? err.message : err);
  }
}

async function main() {
  log.info("airplane_tracker worker starting");
  const regions = await loadRegions();
  log.info(`loaded ${regions.length} regions: ${regions.map((r) => r.slug).join(", ")}`);

  let idx = 0;
  const pollTimer = setInterval(() => {
    const region = regions[idx % regions.length];
    idx += 1;
    void pollRegion(region);
  }, CONFIG.pollIntervalMs);

  const cleanupTimer = setInterval(() => {
    void cleanupStaleFlights();
  }, CONFIG.cleanupIntervalMs);

  // Kick off immediately instead of waiting pollIntervalMs.
  void pollRegion(regions[0]);
  idx = 1;

  const shutdown = (signal: string) => {
    log.info(`received ${signal}, shutting down`);
    clearInterval(pollTimer);
    clearInterval(cleanupTimer);
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  log.error("fatal:", err);
  process.exit(1);
});
