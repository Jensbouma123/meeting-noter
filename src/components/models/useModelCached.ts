import { useRegistryState } from './useRegistryState';

export function useModelCached(key: string): boolean {
  return useRegistryState().entries[key]?.status === 'cached';
}
