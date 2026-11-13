import { useSyncExternalStore } from 'react';
import { NONE, getRecentParticipants, subscribe } from './participants';

export function useRecentParticipants(): string[] {
  return useSyncExternalStore(subscribe, getRecentParticipants, () => NONE);
}
