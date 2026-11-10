import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * WebGPU → WASM fallback in `loadLangIdModel()`: a half-built WebGPU pair
 * (encoder created, decoder failed) must not leak the encoder session.
 */

const fakes = vi.hoisted(() => ({
  sessions: [] as Array<{ backend: string; file: unknown; release: ReturnType<typeof vi.fn> }>,
}));

vi.mock('@/lib/asr/browser/resumable-download', () => ({
  downloadHfFileResumable: async (_repo: string, file: string) => `https://example.test/${file}`,
  takeBlobUrlBytes: () => null,
}));

vi.mock('onnxruntime-web', () => ({
  env: { wasm: {}, versions: { common: '1.24.1' } },
  InferenceSession: {
    create: async (file: unknown, options: { executionProviders: string[] }) => {
      const backend = options.executionProviders[0];
      if (backend === 'webgpu' && String(file).includes('decoder')) throw new Error('no webgpu decoder');
      const session = { backend, file, release: vi.fn(async () => {}) };
      fakes.sessions.push(session);
      return session;
    },
  },
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadLangIdModel', () => {
  it('releases the WebGPU encoder when the WebGPU decoder fails, before falling back to WASM', async () => {
    vi.stubGlobal('navigator', { gpu: {} });
    const { loadLangIdModel } = await import('./model');

    const model = await loadLangIdModel();

    expect(model.backend).toBe('wasm');
    const gpuEncoder = fakes.sessions.find((s) => s.backend === 'webgpu');
    expect(gpuEncoder?.release).toHaveBeenCalledTimes(1);
    for (const s of fakes.sessions.filter((s) => s.backend === 'wasm')) expect(s.release).not.toHaveBeenCalled();
  });
});
