import { describe, expect, it, vi } from 'vitest';
import { PARAKEET_TDT_V3_WEBGPU, PARAKEET_TDT_V3_WEBGPU_FP16, PARAKEET_TDT_V3_WASM } from './model-manifest-parakeet';
import { probeModelSize } from './model-manifest-size-probe';
describe('declared file sizes', () => {
  it.each([
    ['webgpu-q4f16', PARAKEET_TDT_V3_WEBGPU],
    ['webgpu-fp16', PARAKEET_TDT_V3_WEBGPU_FP16],
    ['wasm-int8', PARAKEET_TDT_V3_WASM],
  ])('%s sums its own file sizes', (_label, manifest) => {
    const total = manifest.files.reduce((sum, file) => sum + (manifest.fileSizes[file] ?? 0), 0);
    expect(total).toBe(manifest.fallbackSizeBytes);
    expect(Object.keys(manifest.fileSizes).sort()).toEqual([...manifest.files].sort());
  });

  it('quotes the q4f16 encoder at the size the file on disk actually has', async () => {
    expect(PARAKEET_TDT_V3_WEBGPU.fileSizes['encoder-model.q4f16.onnx']).toBe(515_756_810);
  });

  it('probes the q4f16 override, so the measured total is the q4f16 one', async () => {
    const heads: string[] = [];
    const tree: Record<string, number> = {
      'decoder_joint-model.int8.onnx': 18_202_004,
      'vocab.txt': 93_939,
    };
    const stub = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/models/')) {
        return new Response(
          JSON.stringify(
            Object.entries(tree).map(([path, size]) => ({ type: 'file', path, size })),
          ),
          { status: 200 },
        );
      }
      if (init?.method === 'HEAD') {
        heads.push(url);
        return new Response(null, {
          status: 200,
          headers: { 'content-length': String(515_756_810) },
        });
      }
      return new Response(null, { status: 200 });
    });
    vi.stubGlobal('fetch', stub);
    try {
      const total = await probeModelSize(PARAKEET_TDT_V3_WEBGPU);
      expect(total).toBe(534_052_753);
      expect(heads).toEqual([PARAKEET_TDT_V3_WEBGPU.fileUrlOverrides?.['encoder-model.q4f16.onnx']]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('which WebGPU encoders are offered', () => {
  async function loadWith(env: Record<string, string>) {
    vi.resetModules();
    vi.unstubAllEnvs();
    for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
    const manifest = {
      ...(await import('./model-manifest-parakeet')),
      ...(await import('./model-manifest-selection')),
    };
    const detect = await import('./backend-detect');
    return { manifest, detect };
  }

  it('offers none in a production build with no hosted encoder URL, defaulting to CPU int8', async () => {
    const { manifest, detect } = await loadWith({
      NODE_ENV: 'production',
      NEXT_PUBLIC_Q4F16_ENCODER_URL: '',
      NEXT_PUBLIC_FP16_ENCODER_URL: '',
    });
    expect(manifest.WEBGPU_ENCODER_FALLBACKS).toEqual([]);
    expect(manifest.asrManifestFallbackOrder().map((m) => m.variant)).toEqual(['wasm-int8']);
    expect(manifest.manifestForBackend('webgpu').variant).not.toBe('wasm-int8');
    expect(await detect.detectAsrBackend()).toBe('wasm');
    expect(detect.activeAsrManifest('webgpu').variant).toBe('wasm-int8');
  });

  it('offers only the encoder whose URL is set in production', async () => {
    const { manifest, detect } = await loadWith({
      NODE_ENV: 'production',
      NEXT_PUBLIC_Q4F16_ENCODER_URL: 'https://example.test/q4f16.onnx',
      NEXT_PUBLIC_FP16_ENCODER_URL: '',
    });
    expect(manifest.WEBGPU_ENCODER_FALLBACKS).toEqual(['q4f16']);
    expect(manifest.asrManifestFallbackOrder().map((m) => m.variant)).toEqual(['webgpu-q4f16', 'wasm-int8']);
    expect(manifest.PARAKEET_TDT_V3_WEBGPU.fileUrlOverrides?.['encoder-model.q4f16.onnx']).toBe(
      'https://example.test/q4f16.onnx',
    );
    expect(detect.activeAsrManifest('webgpu').variant).toBe('webgpu-q4f16');
  });

  it('offers both outside production (dev serves public/models)', async () => {
    const { manifest } = await loadWith({ NODE_ENV: 'development' });
    expect(manifest.WEBGPU_ENCODER_FALLBACKS).toEqual(['q4f16', 'fp16']);
  });
});
