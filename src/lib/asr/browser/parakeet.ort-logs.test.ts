import { describe, expect, it, vi } from 'vitest';

/**
 * `parakeet.js` hardcodes `logSeverityLevel: 2` (Warning) for every ONNX
 * session it creates (`node_modules/parakeet.js/src/parakeet.js`'s
 * `baseSessionOptions`) and has no config knob to change it, so the benign
 * "VerifyEachNodeIsAssignedToAnEp"/"Unknown CPU vendor" notices keep printing
 * however the ASR worker configures `env.logLevel` on its own — a
 * session-scoped `logSeverityLevel` wins over the environment default.
 * `parakeet.ts` patches `ort.InferenceSession.create` itself to force the
 * severity up to 3 (Error) no matter what a caller — `parakeet.js` included —
 * asks for.
 */

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

// parakeet.ts only needs the named export to exist; its `fromUrls`/session
// creation is never exercised here.
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
