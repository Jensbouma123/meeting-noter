/**
 * onnxruntime-web session creation for LiquidAI D1: WebGPU first, WASM fallback.
 *
 * Follows `src/lib/diarization/browser/onnx-session.ts` with single-threaded
 * WASM (`numThreads = 1`, `proxy = false`) and `logSeverityLevel: 3`.
 */

import * as ort from 'onnxruntime-web';

const ORT_VERSION = '1.24.1';

let wasmPathsConfigured = false;

function silenceBenignOrtWarnings(): void {
  try {
    ort.env.logLevel = 'error';
  } catch {
    // Runtime without a settable log level.
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

export interface ExternalDataFile {
  path: string;
  data: Uint8Array | string;
}

export type SessionBackend = 'webgpu' | 'wasm';

/** A WebGPU session that has not come up by then is treated as stalled; WASM takes over. */
export const WEBGPU_SESSION_TIMEOUT_MS = 45_000;
/** A WASM session that has not come up by then fails with a clear error. */
export const WASM_SESSION_TIMEOUT_MS = 120_000;

/**
 * `create` raced against a deadline. A session that arrives after the deadline
 * is released, so a stalled attempt cannot leak its memory.
 */
async function createWithDeadline(
  create: (
    m: string | Uint8Array,
    o: ort.InferenceSession.SessionOptions,
  ) => Promise<ort.InferenceSession>,
  model: string | Uint8Array,
  options: ort.InferenceSession.SessionOptions,
  timeoutMs: number,
  backend: SessionBackend,
): Promise<ort.InferenceSession> {
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      reject(new Error(`D1 ${backend} session did not start within ${timeoutMs} ms`));
    }, timeoutMs);
  });
  const attempt = create(model, options);
  attempt.then(
    (session) => {
      if (timedOut) void session.release().catch(() => {});
    },
    () => {},
  );
  try {
    return await Promise.race([attempt, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

/** Create an ONNX inference session, preferring WebGPU with clean WASM fallback. */
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
  if (hasWebGpu) {
    try {
      console.info('[D1] session: webgpu attempt');
      const session = await createWithDeadline(
        create,
        model,
        { ...base, executionProviders: ['webgpu'], logSeverityLevel: 3 },
        WEBGPU_SESSION_TIMEOUT_MS,
        'webgpu',
      );
      return { session, backend: 'webgpu' };
    } catch (err) {
      // Fall through to WASM when WebGPU session initialization fails or stalls.
      console.info('[D1] session: webgpu failed, falling back to wasm', err instanceof Error ? err.message : String(err));
    }
  } else {
    console.info('[D1] session: no navigator.gpu, using wasm');
  }

  console.info('[D1] session: wasm attempt');
  const session = await createWithDeadline(
    create,
    model,
    { ...base, executionProviders: ['wasm'], logSeverityLevel: 3 },
    WASM_SESSION_TIMEOUT_MS,
    'wasm',
  );
  return { session, backend: 'wasm' };
}

export type { InferenceSession } from 'onnxruntime-web';
export { Tensor } from 'onnxruntime-web';
