/** onnxruntime-web session creation: WebGPU first, WASM fallback.
 *
 * Same runtime the app already ships (`onnxruntime-web`, also used
 * transitively via `parakeet.js` for ASR — see `src/lib/asr/browser`). This
 * module configures it independently rather than importing `asr/browser`'s
 * backend-detection helpers, since those are typed around the ASR
 * quantization manifest; the underlying `ort.env.wasm` config is a
 * process-wide singleton either way (both modules import the same
 * `onnxruntime-web` package instance), so setting it here is idempotent with
 * whatever `parakeet.js`/`asr/browser` already did.
 */

import * as ort from 'onnxruntime-web';

const ORT_VERSION = '1.24.1'; // pinned to package.json's onnxruntime-web version

let wasmPathsConfigured = false;

/**
 * ORT's default log level is `warning`, and it emits two of those for every
 * session on this app's models: "Unknown CPU vendor" (the WASM EP's CPU
 * feature probe, which is only ever noise) and "VerifyEachNodeIsAssignedToAnEp"
 * (a partitioner notice for graph nodes the EP handles generically). Neither
 * is actionable, and both arrive during session creation — exactly when a user
 * is watching the console to work out why transcription is not happening, so
 * they bury whatever *is* wrong. Errors still come through.
 *
 * Set once, on the copy of the runtime this module owns. `parakeet.js` (ASR)
 * bundles its own copy of `onnxruntime-web`, which this cannot reach; the ASR
 * path's own diagnostics come from `browser-asr.ts` instead.
 */
function silenceBenignOrtWarnings(): void {
  try {
    ort.env.logLevel = 'error';
  } catch {
    // Older/newer runtime without a settable log level — not worth failing over.
  }
}

function ensureWasmPaths(): void {
  if (wasmPathsConfigured) return;
  wasmPathsConfigured = true;
  silenceBenignOrtWarnings();
  if (!ort.env.wasm.wasmPaths) {
    ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
  }
  // Single-threaded, matching what `src/lib/langid/model.ts` already does.
  //
  // Stated for the record, because it is NOT the cause of the tab crashes this
  // file was last touched for: ONNX Runtime checks cross-origin isolation and
  // falls back to one thread on its own (see `wasm-factory.ts`), so a
  // multi-threaded request on a non-isolated page costs a warning and a
  // separate `.wasm` fetch rather than N copies of the weights. What it *is*
  // good for is being explicit, and for loading the smaller single-threaded
  // binary instead of relying on that fallback.
  //
  // `proxy = false` for the same reason as langid: inference runs in the
  // worker that created the session, and a proxy worker would add a whole
  // extra JS realm (and its own copy of every tensor) for no benefit.
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
}

/** An external-data file for `createSession`: the graph's recorded name
 *  for it, and its bytes (or a URL ONNX Runtime can fetch). */
export interface ExternalDataFile {
  path: string;
  data: Uint8Array | string;
}

export type SessionBackend = 'webgpu' | 'wasm';

/**
 * Create an inference session, trying WebGPU first and falling back to WASM
 * if WebGPU is unavailable or fails to initialize a session for this model
 * (mirrors `BrowserASREngine`'s runtime-fallback philosophy). The same file
 * serves both: see `manifest.ts` for why the q4f16 variant does.
 */
export async function createSession(
  model: string | Uint8Array,
  externalData?: ExternalDataFile[],
): Promise<{ session: ort.InferenceSession; backend: SessionBackend }> {
  ensureWasmPaths();
  // `create` has one overload per input type rather than one taking the union.
  const create = ort.InferenceSession.create as (
    m: string | Uint8Array,
    o: ort.InferenceSession.SessionOptions,
  ) => Promise<ort.InferenceSession>;
  const base: ort.InferenceSession.SessionOptions = externalData ? { externalData } : {};

  // Session-scoped, so it wins over `env.logLevel` above regardless of load
  // order — belt and suspenders against the same benign warnings.
  const hasWebGpu = typeof navigator !== 'undefined' && 'gpu' in navigator;
  if (hasWebGpu) {
    try {
      const session = await create(model, { ...base, executionProviders: ['webgpu'], logSeverityLevel: 3 });
      return { session, backend: 'webgpu' };
    } catch {
      // Fall through to WASM.
    }
  }
  const session = await create(model, { ...base, executionProviders: ['wasm'], logSeverityLevel: 3 });
  return { session, backend: 'wasm' };
}

export type { InferenceSession } from 'onnxruntime-web';
export { Tensor } from 'onnxruntime-web';
