import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const create = vi.fn();

vi.mock('onnxruntime-web/webgpu', () => ({
  env: { wasm: {} },
  InferenceSession: { create: (...args: unknown[]) => create(...args) },
  Tensor: class {},
}));
vi.mock('@/lib/ort-paths', () => ({ applyOrtWasmPaths: () => {} }));

const providersOf = (call: unknown[]) => (call[1] as { executionProviders: string[] }).executionProviders;

describe('createSession WebGPU fallback reason', () => {
  beforeEach(() => {
    create.mockReset();
    create.mockImplementation(async (_m: unknown, o: { executionProviders: string[] }) => ({
      ep: o.executionProviders[0],
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('reports a missing navigator.gpu without trying the WebGPU EP', async () => {
    vi.stubGlobal('navigator', {});
    const { createSession, NO_NAVIGATOR_GPU } = await import('./onnx-session');
    const result = await createSession(new Uint8Array());
    expect(result.backend).toBe('wasm');
    expect(result.webGpuUnavailable).toBe(NO_NAVIGATOR_GPU);
    expect(create.mock.calls.map(providersOf)).toEqual([['wasm']]);
  });

  it('reports the WebGPU create error message and falls back to wasm', async () => {
    vi.stubGlobal('navigator', { gpu: {} });
    create.mockRejectedValueOnce(new Error('no available backend found. ERR: [webgpu] boom'));
    const { createSession } = await import('./onnx-session');
    const result = await createSession(new Uint8Array());
    expect(result).toMatchObject({ backend: 'wasm', session: { ep: 'wasm' } });
    expect(result.webGpuUnavailable).toBe('no available backend found. ERR: [webgpu] boom');
  });

  it('reports no reason when WebGPU succeeds', async () => {
    vi.stubGlobal('navigator', { gpu: {} });
    const { createSession } = await import('./onnx-session');
    const result = await createSession(new Uint8Array());
    expect(result).toMatchObject({ backend: 'webgpu', session: { ep: 'webgpu' }, webGpuUnavailable: null });
  });
});
