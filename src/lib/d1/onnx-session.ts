/**
 * onnxruntime-web session creation for LiquidAI D1: one backend per call (WebGPU or WASM).
 * The worker picks the model variant per backend and owns the fallback order.
 *
 * Follows `src/lib/diarization/browser/onnx-session.ts` with single-threaded
 * WASM (`numThreads = 1`, `proxy = false`) and `logSeverityLevel: 3`.
 */

import * as ort from 'onnxruntime-web';
import { d1Debug } from './log';

let wasmPathsConfigured = false;

function silenceBenignOrtWarnings(): void {
  try {
    ort.env.logLevel = 'error';
  } catch {
    // Runtime without a settable log level.
  }
}

/**
 * The ORT wasm/mjs files are served by the app from `public/ort/` (copied from the installed
 * `onnxruntime-web` by `scripts/sync-ort.mjs`), never from a CDN. An absolute URL: the runtime
 * `import()`s the `.mjs` from inside a worker, where a bare `/ort/` has no document base.
 */
export function ortAssetBase(): string {
  const origin = (globalThis as { location?: { origin?: string } }).location?.origin;
  return origin && origin !== 'null' ? `${origin}/ort/` : '/ort/';
}

function ensureWasmPaths(): void {
  if (wasmPathsConfigured) return;
  wasmPathsConfigured = true;
  silenceBenignOrtWarnings();
  if (!ort.env.wasm.wasmPaths) {
    ort.env.wasm.wasmPaths = ortAssetBase();
  }
  // One thread always: multi-threaded WASM needs SharedArrayBuffer, which needs a cross-origin
  // isolated page (COOP/COEP) that this app does not serve, and Safari gains nothing from a pool.
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  d1Debug('[D1] session: wasm config', {
    wasmPaths: ort.env.wasm.wasmPaths,
    numThreads: ort.env.wasm.numThreads,
    crossOriginIsolated: (globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated ?? false,
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
  });
}

/** How long `requestAdapter()` may take before WebGPU counts as unavailable. */
const WEBGPU_ADAPTER_TIMEOUT_MS = 5_000;

/**
 * Whether WebGPU can really run here: `'gpu' in navigator` is true in Safari even
 * when `requestAdapter()` resolves `null` (or never settles inside a worker), and a
 * WebGPU session on such a browser stalls or fails. Asks for an adapter, with a deadline.
 */
export async function hasWebGpuAdapter(): Promise<boolean> {
  const gpu = typeof navigator === 'undefined'
    ? undefined
    : (navigator as Navigator & { gpu?: { requestAdapter?: () => Promise<unknown> } }).gpu;
  if (!gpu?.requestAdapter) {
    d1Debug('[D1] session: no navigator.gpu');
    return false;
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const adapter = await Promise.race([
      gpu.requestAdapter(),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), WEBGPU_ADAPTER_TIMEOUT_MS);
      }),
    ]);
    d1Debug('[D1] session: webgpu adapter', adapter ? 'found' : 'none (or timed out)');
    return adapter !== null && adapter !== undefined;
  } catch (err) {
    d1Debug('[D1] session: webgpu requestAdapter failed', err instanceof Error ? err.message : String(err));
    return false;
  } finally {
    clearTimeout(timer);
  }
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

/**
 * Create an ONNX inference session on exactly one backend. Rejects when that backend cannot
 * run the model or does not start in time; the caller decides what to try next.
 */
export async function createSession(
  model: string | Uint8Array,
  externalData?: ExternalDataFile[],
  backend: SessionBackend = 'wasm',
): Promise<{ session: ort.InferenceSession; backend: SessionBackend }> {
  ensureWasmPaths();
  const create = ort.InferenceSession.create as (
    m: string | Uint8Array,
    o: ort.InferenceSession.SessionOptions,
  ) => Promise<ort.InferenceSession>;
  const base: ort.InferenceSession.SessionOptions = externalData ? { externalData } : {};

  d1Debug(`[D1] session: ${backend} attempt`);
  const session = await createWithDeadline(
    create,
    model,
    { ...base, executionProviders: [backend], logSeverityLevel: 3 },
    backend === 'webgpu' ? WEBGPU_SESSION_TIMEOUT_MS : WASM_SESSION_TIMEOUT_MS,
    backend,
  );
  d1Debug(`[D1] session: ${backend} ready`);
  return { session, backend };
}

export type { InferenceSession } from 'onnxruntime-web';
export { Tensor } from 'onnxruntime-web';
