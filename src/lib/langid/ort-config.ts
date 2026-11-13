import * as ort from 'onnxruntime-web';

let configured = false;

function silenceOrtLogs(): void {
  try {
    ort.env.logLevel = 'error';
  } catch {
    return;
  }
}

export function ensureOrtConfigured(): void {
  if (configured) return;
  configured = true;
  silenceOrtLogs();
  if (!ort.env.wasm.wasmPaths) {
    const ver = ort.env.versions?.common || '1.24.1';
    ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ver}/dist/`;
  }
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
}
