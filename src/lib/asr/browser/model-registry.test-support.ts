import { vi } from 'vitest';

export const KEY = 'parakeet-ttd';

export async function loadRegistry() {
  const mod = await import('./model-registry');
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

