import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SORTFORMER_GRAPH } from './manifest';

const SORTFORMER_MATMUL_NBITS: Record<string, number[]> = { 'onnx/model_q4f16.onnx': [4, 8] };
const NATIVE_WEBGPU_NBITS = 'Only 4b/8b/2b quantization is supported for MatMulNBits op';
const JSEP_ONLY_4BIT = 'Only 4b quantization is supported for MatMulNBits op';

const require = createRequire(import.meta.url);
const distDir = path.dirname(require.resolve('onnxruntime-web/ort-wasm-simd-threaded.wasm'));
const read = (file: string) => readFileSync(path.join(distDir, file));

function exportedBundle(subpath: string): string {
  const pkg = JSON.parse(readFileSync(path.join(distDir, '..', 'package.json'), 'utf8'));
  return pkg.exports[subpath].import.default.replace('./dist/', '');
}

function wasmOf(bundle: string): string {
  const names = new Set(read(bundle).toString('utf8').match(/ort-wasm-simd-threaded[a-z.]*\.wasm/g));
  expect(names.size).toBe(1);
  return [...names][0];
}

describe('diarizer WebGPU execution provider', () => {
  it('imports the native WebGPU EP build, not the JSEP default', () => {
    const source = readFileSync(path.join(__dirname, 'onnx-session.ts'), 'utf8');
    expect(source).toContain("from 'onnxruntime-web/webgpu'");
    expect(source).not.toMatch(/from 'onnxruntime-web'/);
  });

  it('loads a wasm whose WebGPU MatMulNBits accepts every bit width in the diarization graph', () => {
    const wasm = wasmOf(exportedBundle('./webgpu'));
    expect(wasm).toBe('ort-wasm-simd-threaded.asyncify.wasm');
    expect(read(wasm).includes(NATIVE_WEBGPU_NBITS)).toBe(true);
    const bits = SORTFORMER_MATMUL_NBITS[SORTFORMER_GRAPH.filename];
    expect(bits).toBeDefined();
    expect(bits.every((b) => [2, 4, 8].includes(b))).toBe(true);
  });

  it('would reject the 8-bit nodes on the JSEP default build', () => {
    const wasm = wasmOf(exportedBundle('.'));
    expect(read(wasm).includes(JSEP_ONLY_4BIT)).toBe(true);
    expect(read(wasm).includes(NATIVE_WEBGPU_NBITS)).toBe(false);
  });
});
