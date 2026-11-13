import { useRegistryState } from './useRegistryState';

export function useAnyDownloading(): boolean {
  return Object.values(useRegistryState().entries).some((e) => e.status === 'downloading');
}
