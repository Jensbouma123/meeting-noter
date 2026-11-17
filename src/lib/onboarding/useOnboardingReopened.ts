import { useSyncExternalStore } from 'react';
import { isOnboardingReopened, subscribe } from './store';

export function useOnboardingReopened(): boolean {
  return useSyncExternalStore(subscribe, isOnboardingReopened, () => false);
}
