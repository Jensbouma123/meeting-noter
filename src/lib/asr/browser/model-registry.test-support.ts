import { vi } from 'vitest';

export const KEY = 'parakeet-ttd';

export async function importFullRegistry() {
  return {
    ...(await import('./model-registry-register')),
    ...(await import('./model-registry-state')),
    ...(await import('./model-registry-snapshot')),
    ...(await import('./model-registry-dialog')),
    ...(await import('./model-registry-status')),
    ...(await import('./model-registry-progress')),
    ...(await import('./model-registry-consent')),
  };
}

export async function loadRegistry() {
  const mod = await importFullRegistry();
  mod.initRegistry();
  mod.registerModel({
    key: KEY,
    modelRepo: 'istupakov/parakeet-tdt-0.6b-v3-onnx',
    displayName: 'Parakeet TDT 0.6B v3 (CPU)',
    estimatedSizeBytes: 670_479_942,
    backend: 'wasm',
  });
  return mod;
}

export function installLocalStorage(): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  });
  return store;
}

