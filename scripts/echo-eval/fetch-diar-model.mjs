import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const EVAL_DIR = path.resolve(root, process.env.ECHO_EVAL_DIR ?? '.echo-eval');
const DIR = process.env.ECHO_EVAL_DIAR_MODEL ?? path.join(EVAL_DIR, 'diar-model');
const REPO = 'https://huggingface.co/onnx-community/Nemotron-3-Diarization-ONNX/resolve/main';
const FILES = [
  ['onnx/model_q4f16.onnx', 408_120],
  ['onnx/model_q4f16.onnx_data', 73_076_608],
];

for (const [name, size] of FILES) {
  const out = path.join(DIR, name);
  if (fs.existsSync(out) && fs.statSync(out).size === size) {
    console.log(`have ${name}`);
    continue;
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const res = await fetch(`${REPO}/${name}`);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(`${out}.part`));
  const got = fs.statSync(`${out}.part`).size;
  if (got !== size) throw new Error(`${name}: got ${got} bytes, want ${size}`);
  fs.renameSync(`${out}.part`, out);
  console.log(`fetched ${name} (${got} bytes)`);
}
