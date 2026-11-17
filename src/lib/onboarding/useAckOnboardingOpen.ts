import { useSyncExternalStore } from 'react';
import { shouldShowAckOnboarding, subscribe } from './store';

export function useAckOnboardingOpen(): boolean {
  return useSyncExternalStore(subscribe, shouldShowAckOnboarding, () => false);
}
