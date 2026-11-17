'use client';

import { useOnboardingOpen } from '@/lib/onboarding/store';
import { useAckOnboardingOpen } from '@/lib/onboarding/useAckOnboardingOpen';
import { useAssistantOnboardingOpen } from '@/lib/onboarding/useAssistantOnboardingOpen';
import { AckOnlyDialog } from './AckOnlyDialog';
import { AssistantOnlyDialog } from './AssistantOnlyDialog';
import { OnboardingSteps } from './OnboardingSteps';

export function OnboardingDialog() {
  const open = useOnboardingOpen();
  const ackOpen = useAckOnboardingOpen();
  const assistantOpen = useAssistantOnboardingOpen();
  if (open) return <OnboardingSteps />;
  if (ackOpen) return <AckOnlyDialog />;
  if (assistantOpen) return <AssistantOnlyDialog />;
  return null;
}
