const RAIL_KEY = 'mn.sessionRailOpen';

const listeners = new Set<() => void>();

export function subscribeRailOpen(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

export function getRailOpenSnapshot(): boolean {
  try {
    return window.localStorage.getItem(RAIL_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function getServerRailOpenSnapshot(): boolean {
  return true;
}

export function storeRailOpen(open: boolean) {
  try {
    window.localStorage.setItem(RAIL_KEY, String(open));
  } catch {
    return;
  }
  listeners.forEach((listener) => listener());
}
