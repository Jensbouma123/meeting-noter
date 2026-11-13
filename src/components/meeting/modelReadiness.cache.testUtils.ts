import { vi } from 'vitest';
import type { PARAKEET_TDT_V3_WEBGPU } from '@/lib/asr/browser/model-manifest-parakeet';

export const LOAD_MARKER = 'mn.asr-load-in-progress.v1';
const CONTENT = new Uint8Array(64).map((_, i) => i % 251);

export function stubModelNetwork(manifest: typeof PARAKEET_TDT_V3_WEBGPU): void {
  const hosted = manifest.files.filter((f) => manifest.fileUrlOverrides?.[f] === undefined);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/models/')) {
        return new Response(
          JSON.stringify(hosted.map((path) => ({ type: 'file', path, size: CONTENT.length }))),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      if (init?.method === 'HEAD') {
        return new Response(null, {
          status: 200,
          headers: { 'content-length': String(CONTENT.length), etag: `"${url}"` },
        });
      }
      return new Response(CONTENT, { status: 200 });
    }),
  );
}

export function stubWebgpuDevice(): void {
  vi.stubGlobal('BroadcastChannel', undefined);
  vi.stubGlobal('navigator', {
    ...(globalThis.navigator as unknown as Record<string, unknown>),
    gpu: { requestAdapter: async () => ({ isFallbackAdapter: false }) },
  });
}

function stubStorage(name: 'localStorage' | 'sessionStorage', initial: Record<string, string> = {}): Map<string, string> {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal(name, {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  });
  return store;
}

export function stubPageStorage(
  saved: { local?: Map<string, string>; session?: Map<string, string> } = {},
): { local: Map<string, string>; session: Map<string, string> } {
  vi.stubGlobal('window', globalThis);
  return {
    local: stubStorage('localStorage', Object.fromEntries(saved.local ?? [])),
    session: stubStorage('sessionStorage', Object.fromEntries(saved.session ?? [])),
  };
}

export async function downloadModel(): Promise<void> {
  const registry = { ...(await import('@/lib/asr/browser/model-registry-snapshot')), ...(await import('@/lib/asr/browser/model-registry-consent')), ...(await import('@/lib/asr/browser/model-registry-register')) };
  const manager = await import('@/lib/asr/browser/browser-asr-download-manager');
  registry.registerDefaultModels('webgpu');
  registry.recordConsent('accepted', ['parakeet-ttd']);
  await manager.initiateDownloads();
}

export async function readiness(): Promise<string> {
  const registry = { ...(await import('@/lib/asr/browser/model-registry-snapshot')), ...(await import('@/lib/asr/browser/model-registry-consent')), ...(await import('@/lib/asr/browser/model-registry-register')) };
  await import('@/lib/meeting/asr/init');
  const { getBrowserASRProgress } = await import('@/lib/meeting/asr/progress-build');
  const { deriveModelReadiness } = await import('./modelReadiness');
  const progress = getBrowserASRProgress();
  return deriveModelReadiness(Object.values(registry.getState().entries), {
    enabled: progress.enabled,
    phase: progress.phase,
  });
}
