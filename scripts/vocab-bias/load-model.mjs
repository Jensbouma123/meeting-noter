import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { repoRoot } from './repo-root.mjs';

export async function loadParakeetModel(modelsDir) {
  const wasmPaths = pathToFileURL(path.join(repoRoot, 'node_modules/onnxruntime-web/dist/')).href;
  const quiet = console.log;
  console.log = () => {};
  const ort = await import('onnxruntime-web');
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
  return model;
}
