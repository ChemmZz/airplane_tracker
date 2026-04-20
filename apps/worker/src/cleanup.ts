import { supabase } from "./supabase.js";
import { CONFIG } from "./config.js";
import { log } from "./logger.js";

export async function cleanupStaleFlights() {
  const cutoff = new Date(Date.now() - CONFIG.staleAfterMs).toISOString();
  const { error, count } = await supabase()
    .from("flights")
    .delete({ count: "exact" })
    .lt("last_seen_at", cutoff);
  if (error) {
    log.error("cleanup failed:", error.message);
    return;
  }
  log.info(`cleanup removed ${count ?? 0} stale flights (older than ${cutoff})`);
}
