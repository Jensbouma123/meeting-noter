const browserListeners = new Set<() => void>();

export function notifyBrowserListeners(): void {
  for (const fn of browserListeners) fn();
}

export function subscribeBrowserASR(fn: () => void): () => void {
  browserListeners.add(fn);
  return () => {
    browserListeners.delete(fn);
  };
}
