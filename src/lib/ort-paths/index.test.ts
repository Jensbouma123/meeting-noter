import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyOrtWasmPaths, ORT_WASM_BASE, TRANSFORMERS_ORT_WASM_BASE } from './index';

const root = path.resolve(__dirname, '../../..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|mjs)$/.test(name) && name !== 'index.test.ts' ? [full] : [];
  });
}

describe('ort-paths', () => {
  it('points wasmPaths at the same-origin base', () => {
    const env = { wasm: {} as { wasmPaths?: unknown } };
    applyOrtWasmPaths(env);
    expect(env.wasm.wasmPaths).toBe(ORT_WASM_BASE);
    applyOrtWasmPaths(env, TRANSFORMERS_ORT_WASM_BASE);
    expect(env.wasm.wasmPaths).toBe('/ort/transformers/');
  });

  it('overrides a preset wasmPaths and ignores an env without wasm', () => {
    const env = { wasm: { wasmPaths: 'https://elsewhere/' } };
    applyOrtWasmPaths(env);
    expect(env.wasm.wasmPaths).toBe('/ort/web/');
    expect(() => applyOrtWasmPaths({})).not.toThrow();
  });

  it('leaves no CDN reference in src', () => {
    const hits = sourceFiles(path.join(root, 'src')).filter((f) => readFileSync(f, 'utf8').includes('jsdelivr'));
    expect(hits).toEqual([]);
  });

  it('copies the runtime files for both onnxruntime-web copies', () => {
    execFileSync('node', [path.join(root, 'src/lib/ort-paths/copy-ort-wasm.mjs')]);
    for (const dir of ['web', 'transformers']) {
      for (const f of [
        'ort-wasm-simd-threaded.wasm',
        'ort-wasm-simd-threaded.mjs',
        'ort-wasm-simd-threaded.jsep.wasm',
      ]) {
        expect(existsSync(path.join(root, 'public/ort', dir, f))).toBe(true);
      }
    }
  });
});
