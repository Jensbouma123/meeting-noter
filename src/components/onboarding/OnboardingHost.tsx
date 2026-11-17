'use client';

import { useRegisterModelsOnMount } from '@/components/models/useRegisterModelsOnMount';
import { OnboardingDialog } from './OnboardingDialog';

export function OnboardingHost() {
  useRegisterModelsOnMount();
  return <OnboardingDialog />;
}
