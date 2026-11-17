import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const out = path.join(root, 'public', 'ort');

const sources = {
  web: path.join(root, 'node_modules', 'onnxruntime-web', 'dist'),
  transformers: path.join(root, 'node_modules', '@huggingface', 'transformers', 'node_modules', 'onnxruntime-web', 'dist'),
};
if (!existsSync(sources.transformers)) sources.transformers = sources.web;

export function copyOrtWasm() {
  rmSync(out, { recursive: true, force: true });
  for (const [name, dist] of Object.entries(sources)) {
    const files = readdirSync(dist).filter((f) => /^ort-wasm-simd-threaded.*\.(wasm|mjs)$/.test(f));
    if (files.length === 0) throw new Error(`no ONNX Runtime wasm files in ${dist}`);
    mkdirSync(path.join(out, name), { recursive: true });
    for (const f of files) cpSync(path.join(dist, f), path.join(out, name, f));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) copyOrtWasm();
