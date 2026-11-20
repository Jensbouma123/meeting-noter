'use client';

import { usePathname } from 'next/navigation';
import { useRegisterModelsOnMount } from '@/components/models/useRegisterModelsOnMount';
import { isDevRoute } from '@/lib/routes/is-dev-route';
import { OnboardingDialog } from './OnboardingDialog';

export function OnboardingHost() {
  useRegisterModelsOnMount();
  if (isDevRoute(usePathname())) return null;
  return <OnboardingDialog />;
}
