import * as ort from 'onnxruntime-web';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ORT_WASM_BASE } from '@/lib/ort-paths';

const seen: unknown[] = [];

vi.mock('parakeet.js', () => ({
  ParakeetModel: {
    fromUrls: vi.fn(async () => {
      seen.push(ort.env.wasm.wasmPaths);
      return {};
    }),
  },
}));

vi.mock('./model-file-urls', () => ({
  resolveModelFileUrls: vi.fn(async () => ({
    encoderUrl: 'e',
    decoderUrl: 'd',
    tokenizerUrl: 't',
    preprocessorUrl: 'p',
  })),
}));

import { createParakeetModel } from './parakeet-model-factory';

describe('createParakeetModel', () => {
  beforeEach(() => {
    seen.length = 0;
    ort.env.wasm.wasmPaths = undefined;
  });

  it('points onnxruntime-web at the same-origin wasm before parakeet.js can pick a CDN', async () => {
    await createParakeetModel({ backend: 'wasm' } as never, () => undefined);
    expect(seen).toEqual([ORT_WASM_BASE]);
  });
});
