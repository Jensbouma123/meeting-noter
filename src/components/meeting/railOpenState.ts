export const RAIL_OPEN_KEY = 'mn.speakerRailOpen';
const NARROW_BREAKPOINT_PX = 1024;

export function readInitialRailOpen(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const saved = window.localStorage.getItem(RAIL_OPEN_KEY);
    if (saved !== null) return saved === '1';
    if (window.innerWidth < NARROW_BREAKPOINT_PX) return false;
  } catch {
    return true;
  }
  return true;
}

export function persistRailOpen(open: boolean): void {
  try {
    window.localStorage.setItem(RAIL_OPEN_KEY, open ? '1' : '0');
  } catch {
    return;
  }
}
