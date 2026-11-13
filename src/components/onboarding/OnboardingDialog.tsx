'use client';

import { useAssistantOnboardingOpen, useOnboardingOpen } from '@/lib/onboarding/store';
import { AssistantOnlyDialog } from './AssistantOnlyDialog';
import { OnboardingSteps } from './OnboardingSteps';
import type { OnboardingDialogProps } from './types';

export function OnboardingDialog({ settings, onSettingsChange }: OnboardingDialogProps) {
  const open = useOnboardingOpen();
  const assistantOpen = useAssistantOnboardingOpen();
  if (open) return <OnboardingSteps settings={settings} onSettingsChange={onSettingsChange} />;
  if (assistantOpen) return <AssistantOnlyDialog />;
  return null;
}
