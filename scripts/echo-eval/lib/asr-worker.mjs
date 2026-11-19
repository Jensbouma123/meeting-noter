// Worker thread: owns the real Parakeet int8 wasm model (same parakeet.js the app uses) so the
// vitest process can call model.transcribe() without loading onnxruntime inside jsdom.
import path from 'node:path';
import fs from 'node:fs';
import { parentPort, workerData } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';

const { modelsDir, repoRoot } = workerData;
const wasmPaths = pathToFileURL(path.join(repoRoot, 'node_modules/onnxruntime-web/dist/')).href;
const quiet = console.log;
console.log = () => {};
const ort = await import(pathToFileURL(path.join(repoRoot, 'node_modules/onnxruntime-web/dist/ort.node.min.mjs')).href).catch(
  () => import('onnxruntime-web'),
);
ort.env.wasm.wasmPaths = wasmPaths;
const { ParakeetModel } = await import('parakeet.js');
const model = await ParakeetModel.fromUrls({
  encoderUrl: path.join(modelsDir, 'encoder-model.int8.onnx'),
  decoderUrl: path.join(modelsDir, 'decoder_joint-model.int8.onnx'),
  tokenizerUrl: `data:text/plain;base64,${fs.readFileSync(path.join(modelsDir, 'vocab.txt')).toString('base64')}`,
  backend: 'wasm',
  wasmPaths,
  cpuThreads: 4,
  preprocessorBackend: 'js',
});
console.log = quiet;
parentPort.postMessage({ ready: true });
parentPort.on('message', async ({ id, audio, sampleRate, options }) => {
  try {
    const r = await model.transcribe(audio, sampleRate, options);
    parentPort.postMessage({ id, result: { utterance_text: r.utterance_text, words: r.words ?? [] } });
  } catch (e) {
    parentPort.postMessage({ id, error: String(e?.message ?? e) });
  }
});
