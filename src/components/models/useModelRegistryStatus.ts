'use client';

import { useSyncExternalStore } from 'react';
import { subscribeRegistry, getState, getServerSnapshot } from '@/lib/asr/browser';

function useRegistryState() {
  return useSyncExternalStore(subscribeRegistry, getState, getServerSnapshot);
}

export function useModelCached(key: string): boolean {
  return useRegistryState().entries[key]?.status === 'cached';
}

export function useModelStatus(key: string): string | undefined {
  return useRegistryState().entries[key]?.status;
}

export function useAnyDownloading(): boolean {
  return Object.values(useRegistryState().entries).some((e) => e.status === 'downloading');
}

export function useAnyModelFailed(): boolean {
  return Object.values(useRegistryState().entries).some((e) => e.status === 'failed');
}
