import { useRegistryState } from './useRegistryState';

export function useModelStatus(key: string): string | undefined {
  return useRegistryState().entries[key]?.status;
}
