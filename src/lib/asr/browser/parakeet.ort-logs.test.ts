import { describe, expect, it, vi } from 'vitest';

const createMock = vi.fn().mockResolvedValue({ inputNames: [], outputNames: [] });

vi.mock('onnxruntime-web', () => {
  class InferenceSession {
    static create = createMock;
  }
  return {
    InferenceSession,
    env: { logLevel: undefined, wasm: {}, versions: { common: '1.24.1' } },
    Tensor: class {},
  };
});

vi.mock('parakeet.js', () => ({ ParakeetModel: class {} }));

describe('ASR worker: ORT session log suppression', () => {
  it('sets the environment log level to error on import', async () => {
    await import('./parakeet');
    const ort = await import('onnxruntime-web');
    expect(ort.env.logLevel).toBe('error');
  });

  it('forces logSeverityLevel to 3 even when the caller asks for 2 (parakeet.js\'s default)', async () => {
    await import('./parakeet');
    const ort = await import('onnxruntime-web');

    await ort.InferenceSession.create('model.onnx', {
      logSeverityLevel: 2,
      executionProviders: ['wasm'],
    });

    expect(createMock).toHaveBeenCalledWith(
      'model.onnx',
      expect.objectContaining({ logSeverityLevel: 3, executionProviders: ['wasm'] }),
    );
  });

  it('still sets logSeverityLevel to 3 when a caller passes no options at all', async () => {
    await import('./parakeet');
    const ort = await import('onnxruntime-web');

    await ort.InferenceSession.create('model.onnx');

    expect(createMock).toHaveBeenCalledWith('model.onnx', expect.objectContaining({ logSeverityLevel: 3 }));
  });
});
