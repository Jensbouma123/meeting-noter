import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installLocalStorage, load } from './browser-asr-download-manager.test-support';

vi.mock('./resumable-download', () => ({
  downloadParakeetModelResumable: vi.fn(),
  closeModelCacheConnections: vi.fn(),
  deleteModelCache: vi.fn(async () => ({ deleted: true })),
  abortInFlightDownloads: vi.fn(),
  isDownloadCancelled: (err: unknown) => err instanceof Error && err.name === 'AbortError',
}));


beforeEach(() => {
  vi.resetModules();
  installLocalStorage();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('a missing WebGPU encoder', () => {
  it('falls back to the next variant on a 404, keeps consent, and downloads it', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { registry, manager, downloader } = await load();
    const detect = await import('./backend-detect');
    const { PARAKEET_TDT_V3_WEBGPU } = await import('./model-manifest');
    detect.resetAsrBackendDetectionForTests();

    registry.registerManifest(PARAKEET_TDT_V3_WEBGPU);
    registry.recordConsent('accepted', [PARAKEET_TDT_V3_WEBGPU.key]);

    const seen: string[] = [];
    vi.mocked(downloader.downloadParakeetModelResumable).mockImplementation(async (m) => {
      seen.push(m.variant);
      if (m.variant !== 'wasm-int8') {
        throw new Error(`Failed to download ${m.files[0]}: 404 Not Found (/x)`);
      }
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));

    await manager.initiateDownloads();

    expect(seen).toEqual(['webgpu-q4f16', 'webgpu-fp16', 'wasm-int8']);
    const entry = registry.getState().entries[PARAKEET_TDT_V3_WEBGPU.key];
    expect(entry.variant).toBe('wasm-int8');
    expect(entry.status).toBe('cached');
    expect(entry.description).toMatch(/isn't available here/);
    expect(registry.isConsentGiven(PARAKEET_TDT_V3_WEBGPU.key)).toBe(true);
  });

  it('does not fall back on a non-404 failure', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { registry, manager, downloader } = await load();
    const { PARAKEET_TDT_V3_WEBGPU } = await import('./model-manifest');
    registry.registerManifest(PARAKEET_TDT_V3_WEBGPU);
    registry.recordConsent('accepted', [PARAKEET_TDT_V3_WEBGPU.key]);
    vi.mocked(downloader.downloadParakeetModelResumable).mockRejectedValue(
      new Error('Failed to download encoder-model.q4f16.onnx: 503 Service Unavailable (/x)'),
    );
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));

    await expect(manager.initiateDownloads()).rejects.toThrow(/503/);
    expect(registry.getState().entries[PARAKEET_TDT_V3_WEBGPU.key].variant).toBe('webgpu-q4f16');
  });
});

describe('saved choice migration', () => {
  it('re-points a saved, unavailable WebGPU variant at the CPU one, keeping consent', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_Q4F16_ENCODER_URL', '');
    vi.stubEnv('NEXT_PUBLIC_FP16_ENCODER_URL', '');
    vi.stubGlobal('window', {});
    const first = await load();
    const { PARAKEET_TDT_V3_WEBGPU } = await import('./model-manifest');
    first.registry.registerManifest(PARAKEET_TDT_V3_WEBGPU);
    first.registry.markFailed(PARAKEET_TDT_V3_WEBGPU.key, 'Download failed: Failed to download encoder-model.q4f16.onnx: 404');
    first.registry.recordConsent('accepted', [PARAKEET_TDT_V3_WEBGPU.key]);

    vi.resetModules();
    const second = await load();
    const entry = second.registry.getState().entries[PARAKEET_TDT_V3_WEBGPU.key];
    expect(entry.variant).toBe('wasm-int8');
    expect(entry.backend).toBe('wasm');
    expect(entry.status).toBe('not-downloaded');
    expect(second.registry.isConsentGiven(PARAKEET_TDT_V3_WEBGPU.key)).toBe(true);
  });
});
