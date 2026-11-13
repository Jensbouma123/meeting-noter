import type { ReactNode } from 'react';

export interface ModelRegistryProviderProps {
  children: ReactNode;
  onDialogDismiss?: () => void;
}
