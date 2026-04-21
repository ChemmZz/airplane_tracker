export const CONFIG = {
  // How often to poll one live region (ms). Live regions are selected by users
  // and deduplicated across all users before polling.
  pollIntervalMs: 30_000,

  // How often to prune stale rows (ms).
  cleanupIntervalMs: 5 * 60_000,

  // Delete flights not seen in this long.
  staleAfterMs: 10 * 60_000,

  // Safety margin on OAuth token expiry.
  tokenSafetyMs: 60_000,
};
