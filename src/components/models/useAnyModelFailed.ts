import { useRegistryState } from './useRegistryState';

export function useAnyModelFailed(): boolean {
  return Object.values(useRegistryState().entries).some((e) => e.status === 'failed');
}
