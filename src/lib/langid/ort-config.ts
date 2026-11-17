import * as ort from 'onnxruntime-web';
import { applyOrtWasmPaths } from '@/lib/ort-paths';

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
  applyOrtWasmPaths(ort.env);
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
}
