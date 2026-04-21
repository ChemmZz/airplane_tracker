import { resolve } from "node:path";
import { fetchStates } from "./opensky.js";
import { supabase, type Region } from "./supabase.js";
import { upsertRegionStates } from "./upsert.js";
import { cleanupStaleFlights } from "./cleanup.js";
import { CONFIG } from "./config.js";
import { log } from "./logger.js";

// Next.js loads `.env.local` automatically; this standalone worker does not.
// Load the worker env file on boot so local dev matches deploy-time behavior.
(process as NodeJS.Process & { loadEnvFile?: (path?: string) => void }).loadEnvFile?.(
  resolve(process.cwd(), ".env.local"),
);

async function loadRegions(): Promise<Region[]> {
  const { data, error } = await supabase().from("regions").select("*").order("slug");
  if (error) throw new Error(`Load regions: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error("No regions in DB — run the seed migration first");
  }
  return data as Region[];
}

async function loadLiveRegions(): Promise<Region[]> {
  const { data, error } = await supabase()
    .from("user_live_regions")
    .select("region_id, is_paused, regions(*)")
    .eq("is_paused", false);
  if (error) throw new Error(`Load live regions: ${error.message}`);

  const deduped = new Map<string, Region>();
  for (const row of data ?? []) {
    const region = Array.isArray(row.regions)
      ? (row.regions[0] as Region | undefined)
      : (row.regions as Region | null);
    if (region) deduped.set(region.id, region);
  }
  return [...deduped.values()].sort((a, b) => a.slug.localeCompare(b.slug));
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
  await loadRegions();

  let idx = 0;
  const pollLiveRegion = async () => {
    const regions = await loadLiveRegions();
    if (regions.length === 0) {
      log.info("no live regions selected");
      return;
    }

    const region = regions[idx % regions.length];
    idx += 1;
    log.info(`loaded ${regions.length} live regions: ${regions.map((r) => r.slug).join(", ")}`);
    await pollRegion(region);
  };

  const pollTimer = setInterval(() => {
    void pollLiveRegion();
  }, CONFIG.pollIntervalMs);

  const cleanupTimer = setInterval(() => {
    void cleanupStaleFlights();
  }, CONFIG.cleanupIntervalMs);

  // Kick off immediately instead of waiting pollIntervalMs.
  void pollLiveRegion();

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
