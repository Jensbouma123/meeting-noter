'use client';

import { useOnboardingOpen } from '@/lib/onboarding/store';
import { useAssistantOnboardingOpen } from '@/lib/onboarding/useAssistantOnboardingOpen';
import { AssistantOnlyDialog } from './AssistantOnlyDialog';
import { OnboardingSteps } from './OnboardingSteps';

export function OnboardingDialog() {
  const open = useOnboardingOpen();
  const assistantOpen = useAssistantOnboardingOpen();
  if (open) return <OnboardingSteps />;
  if (assistantOpen) return <AssistantOnlyDialog />;
  return null;
}
