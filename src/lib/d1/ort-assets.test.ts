// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ortAssetBase } from './onnx-session';

const root = process.cwd();
const FILES = [
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.jsep.mjs',
  'ort-wasm-simd-threaded.jsep.wasm',
];

describe('self-hosted ORT runtime', () => {
  it.each(FILES)('public/ort/%s matches the installed onnxruntime-web', (name) => {
    const installed = readFileSync(path.join(root, 'node_modules/onnxruntime-web/dist', name));
    const served = readFileSync(path.join(root, 'public/ort', name));
    expect(served.equals(installed)).toBe(true);
  });

  it('points at the app origin, not a CDN', () => {
    expect(ortAssetBase()).toMatch(/\/ort\/$/);
    expect(ortAssetBase()).not.toContain('jsdelivr');
  });
});
