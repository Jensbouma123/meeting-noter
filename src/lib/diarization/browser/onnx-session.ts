import * as ort from 'onnxruntime-web';
import type { ExternalDataFile, SessionBackend } from './types';

const ORT_VERSION = '1.24.1';

let wasmPathsConfigured = false;

function silenceBenignOrtWarnings(): void {
  try {
    ort.env.logLevel = 'error';
  } catch {
    return;
  }
}

function ensureWasmPaths(): void {
  if (wasmPathsConfigured) return;
  wasmPathsConfigured = true;
  silenceBenignOrtWarnings();
  if (!ort.env.wasm.wasmPaths) {
    ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
  }
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
}

export async function createSession(
  model: string | Uint8Array,
  externalData?: ExternalDataFile[],
): Promise<{ session: ort.InferenceSession; backend: SessionBackend }> {
  ensureWasmPaths();
  const create = ort.InferenceSession.create as (
    m: string | Uint8Array,
    o: ort.InferenceSession.SessionOptions,
  ) => Promise<ort.InferenceSession>;
  const base: ort.InferenceSession.SessionOptions = externalData ? { externalData } : {};

  const hasWebGpu = typeof navigator !== 'undefined' && 'gpu' in navigator;
  const webGpuSession = hasWebGpu
    ? await create(model, { ...base, executionProviders: ['webgpu'], logSeverityLevel: 3 }).catch(() => null)
    : null;
  if (webGpuSession) return { session: webGpuSession, backend: 'webgpu' };
  const session = await create(model, { ...base, executionProviders: ['wasm'], logSeverityLevel: 3 });
  return { session, backend: 'wasm' };
}

export type { InferenceSession } from 'onnxruntime-web';
export { Tensor } from 'onnxruntime-web';
