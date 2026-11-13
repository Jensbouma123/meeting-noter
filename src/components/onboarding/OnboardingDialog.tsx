'use client';

import { useOnboardingOpen } from '@/lib/onboarding/store';
import { OnboardingSteps } from './OnboardingSteps';
import type { OnboardingDialogProps } from './types';

export function OnboardingDialog({ settings, onSettingsChange }: OnboardingDialogProps) {
  const open = useOnboardingOpen();
  if (!open) return null;
  return <OnboardingSteps settings={settings} onSettingsChange={onSettingsChange} />;
}
