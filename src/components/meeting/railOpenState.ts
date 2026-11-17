export const RAIL_OPEN_KEY = 'mn.speakerRailOpen';

export function readStoredRailOpen(): boolean | null {
  try {
    const saved = window.localStorage.getItem(RAIL_OPEN_KEY);
    return saved === null ? null : saved === '1';
  } catch {
    return null;
  }
}

export function persistRailOpen(open: boolean): void {
  try {
    window.localStorage.setItem(RAIL_OPEN_KEY, open ? '1' : '0');
  } catch {
    return;
  }
}
