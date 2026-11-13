import { useSyncExternalStore } from 'react';
import { shouldShowAssistantOnboarding, subscribe } from './store';

export function useAssistantOnboardingOpen(): boolean {
  return useSyncExternalStore(subscribe, shouldShowAssistantOnboarding, () => false);
}
