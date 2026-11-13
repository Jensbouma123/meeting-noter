export function describeDownloadError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const looksLikeNetworkFailure =
    err instanceof TypeError && /fetch|network/i.test(message);

  if (isOffline || looksLikeNetworkFailure) {
    return "You're offline — check your connection and try again.";
  }
  return `Download failed: ${message}`;
}
