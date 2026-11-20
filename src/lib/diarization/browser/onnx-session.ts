import * as ort from 'onnxruntime-web';
import { applyOrtWasmPaths } from '@/lib/ort-paths';
import type { ExternalDataFile } from './types';
import type { CreateSessionFn as CreateFn, CreatedSession } from './types/session';

export const NO_NAVIGATOR_GPU = 'navigator.gpu is missing in the diarizer worker';

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
  applyOrtWasmPaths(ort.env);
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
}

function navigatorGpu(): unknown {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as unknown as { gpu?: unknown }).gpu;
}

async function createOnWebGpu(
  create: CreateFn,
  model: string | Uint8Array,
  base: ort.InferenceSession.SessionOptions,
): Promise<ort.InferenceSession | string> {
  if (!navigatorGpu()) return NO_NAVIGATOR_GPU;
  try {
    return await create(model, { ...base, executionProviders: ['webgpu'], logSeverityLevel: 3 });
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

export async function createSession(
  model: string | Uint8Array,
  externalData?: ExternalDataFile[],
): Promise<CreatedSession> {
  ensureWasmPaths();
  const create = ort.InferenceSession.create as CreateFn;
  const base: ort.InferenceSession.SessionOptions = externalData ? { externalData } : {};
  const webGpu = await createOnWebGpu(create, model, base);
  if (typeof webGpu !== 'string') return { session: webGpu, backend: 'webgpu', webGpuUnavailable: null };
  const session = await create(model, { ...base, executionProviders: ['wasm'], logSeverityLevel: 3 });
  return { session, backend: 'wasm', webGpuUnavailable: webGpu };
}

export type { InferenceSession } from 'onnxruntime-web';
export { Tensor } from 'onnxruntime-web';
