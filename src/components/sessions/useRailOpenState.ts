import { useEffect, useState } from 'react';

const RAIL_KEY = 'mn.sessionRailOpen';

function storeRailOpen(open: boolean) {
  try {
    window.localStorage.setItem(RAIL_KEY, String(open));
  } catch {
    return;
  }
}

function readStoredRailClosed(): boolean {
  try {
    return window.localStorage.getItem(RAIL_KEY) === 'false';
  } catch {
    return false;
  }
}

export function useRailOpenState(controlledOpen?: boolean, controlledToggle?: () => void) {
  const [ownOpen, setOwnOpen] = useState(true);

  useEffect(() => {
    if (readStoredRailClosed()) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot hydration */
      setOwnOpen(false);
    }
  }, []);

  const toggleOwn = () => {
    const next = !ownOpen;
    setOwnOpen(next);
    storeRailOpen(next);
  };

  return { open: controlledOpen ?? ownOpen, toggle: controlledToggle ?? toggleOwn };
}
