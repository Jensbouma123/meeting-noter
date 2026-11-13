import { vi } from 'vitest';

export type Progress = { loaded: number; total: number; file: string; resuming: boolean };

export function deferred() {
  let resolve!: () => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export function installLocalStorage(): void {
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
}

export async function load() {
  const registry = await import('./model-registry');
  const manager = await import('./browser-asr-download-manager');
  const downloader = await import('./resumable-download');
  registry.initRegistry();
  return { registry, manager, downloader };
}

export function registerTestModel(registry: typeof import('./model-registry'), key: string): void {
  registry.registerModel({
    key,
    modelRepo: `test/${key}`,
    displayName: key,
    estimatedSizeBytes: 1_000,
    backend: 'wasm',
    kind: 'test',
  });
}

export const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
