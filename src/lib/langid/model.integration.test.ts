// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import * as ort from 'onnxruntime-web';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { computeLogMelSpectrogram } from './mel';
import { detectLanguage } from './detect-language';
import type { LangIdModel } from './types';
import { pickSupportedLanguage } from './decision';

const dir = process.env.LANGID_MODEL_DIR;
vi.setConfig({ testTimeout: 120_000 });

function readWav16k(path: string): Float32Array {
  const buf = readFileSync(path);
  const pcm = new Int16Array(buf.buffer.slice(buf.byteOffset + 44, buf.byteOffset + buf.byteLength));
  return Float32Array.from(pcm, (v) => v / 32768);
}

describe.skipIf(!dir)('language ID on real audio', () => {
  it('maps Dutch speech to nl (macOS `say -v Xander` clip)', async () => {
    const open = (f: string) =>
      ort.InferenceSession.create(new Uint8Array(readFileSync(resolve(dir!, f))), { executionProviders: ['wasm'] });
    const model: LangIdModel = {
      encoder: await open('encoder_model_quantized.onnx'),
      decoder: await open('decoder_model_quantized.onnx'),
      backend: 'wasm',
    };
    const audio = readWav16k(resolve(__dirname, '../../../../test-audio/nl-tts-langid.wav'));
    const top = pickSupportedLanguage(await detectLanguage(model, computeLogMelSpectrogram(audio)));
    expect(top?.code).toBe('nl');
    expect(top?.confidence).toBeGreaterThan(0.5);
  });
});
