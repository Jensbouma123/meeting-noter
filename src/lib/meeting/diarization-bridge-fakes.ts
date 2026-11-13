import type { DiarizationTestTurn } from './types/diarization-test';

export const fakes = {
  created: [] as string[],
  disposed: [] as string[],
  turn: new Map<string, (turn: DiarizationTestTurn) => void>(),
  ready: new Map<string, (info: { backend: 'webgpu' | 'wasm' }) => void>(),
  error: new Map<string, (message: string, code: 'not-cached' | 'failed') => void>(),
  retried: [] as string[],
};


export async function mockAsrBrowser(importOriginal: () => Promise<typeof import('@/lib/asr/browser')>) {
  const actual = await importOriginal();
  return {
    ...actual,
    retryDownload: async (key: string) => {
      fakes.retried.push(key);
      actual.markNotCached(key);
    },
  };
}

export function mockDiarizationBrowser() {
  return {
    createDiarizer: ({ source }: { source: string }) => {
      fakes.created.push(source);
      return {
        push() {},
        onSpeakerTurn(cb: (turn: DiarizationTestTurn) => void) {
          fakes.turn.set(source, cb);
          return () => {};
        },
        onReady(cb: (info: { backend: 'webgpu' | 'wasm' }) => void) {
          fakes.ready.set(source, cb);
          return () => {};
        },
        onError(cb: (message: string, code: 'not-cached' | 'failed') => void) {
          fakes.error.set(source, cb);
          return () => {};
        },
        flush: async () => {},
        dispose() {
          fakes.disposed.push(source);
        },
      };
    },
  };
}

export async function modules() {
  const registry = await import('@/lib/asr/browser');
  const bridgeModule = await import('./diarization-bridge');
  const registryModule = await import('./diarization-registry');
  const store = await import('./store');
  return { registry, bridge: { ...bridgeModule, ...registryModule }, store };
}

export async function consentedAndCached() {
  const m = await modules();
  m.bridge.registerDiarizationModel('webgpu');
  m.registry.recordConsent('accepted', [m.bridge.DIARIZATION_REGISTRY_KEY]);
  m.registry.markCached(m.bridge.DIARIZATION_REGISTRY_KEY);
  return m;
}

export async function resetFakesAndRegistry(): Promise<void> {
  fakes.created.length = 0;
  fakes.disposed.length = 0;
  fakes.retried.length = 0;
  fakes.turn.clear();
  fakes.ready.clear();
  fakes.error.clear();
  const { registry, store } = await modules();
  registry.resetAllEntries();
  registry.resetConsent();
  store.resetSession('mic');
}

export async function resetBridge(): Promise<void> {
  const { bridge } = await modules();
  bridge.resetDiarization();
}
