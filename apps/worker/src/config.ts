export const CONFIG = {
  // How often to poll one region (ms). Round-robin through regions.
  // ~90s × 6 regions → one region sampled every ~9 minutes.
  // Budget: 960 polls/day × ~4 credits ≈ 3840/4000 daily credits.
  pollIntervalMs: 90_000,

  // How often to prune stale rows (ms).
  cleanupIntervalMs: 5 * 60_000,

  // Delete flights not seen in this long.
  staleAfterMs: 10 * 60_000,

  // Safety margin on OAuth token expiry.
  tokenSafetyMs: 60_000,
};
