'use client';

import { ModelConsentDialog } from './consent/ModelConsentDialog';
import { useRegisterModelsOnMount } from './useRegisterModelsOnMount';
import type { ModelRegistryProviderProps } from './ModelRegistryProvider.types';

export function ModelRegistryProvider({ children, onDialogDismiss }: ModelRegistryProviderProps) {
  useRegisterModelsOnMount();

  return (
    <>
      <ModelConsentDialog onDismiss={onDialogDismiss} />
      {children}
    </>
  );
}
