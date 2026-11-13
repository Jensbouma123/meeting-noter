import { useSyncExternalStore } from 'react';
import { getRailOpenSnapshot, getServerRailOpenSnapshot, storeRailOpen, subscribeRailOpen } from './railOpenStore';

export function useRailOpenState(controlledOpen?: boolean, controlledToggle?: () => void) {
  const ownOpen = useSyncExternalStore(subscribeRailOpen, getRailOpenSnapshot, getServerRailOpenSnapshot);

  const toggleOwn = () => storeRailOpen(!ownOpen);

  return { open: controlledOpen ?? ownOpen, toggle: controlledToggle ?? toggleOwn };
}
