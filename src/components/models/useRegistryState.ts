import { useSyncExternalStore } from 'react';
import { subscribeRegistry, getState, getServerSnapshot } from '@/lib/asr/browser';

export function useRegistryState() {
  return useSyncExternalStore(subscribeRegistry, getState, getServerSnapshot);
}
