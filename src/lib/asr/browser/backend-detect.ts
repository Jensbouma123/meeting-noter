/** WebGPU vs. WASM backend detection for browser ASR.
 *
 * `'gpu' in navigator` (what both `parakeet.js`'s own `initOrt` and this
 * codebase's previous `isWebGPUAvailable()` checked) is not sufficient: Safari
 * can expose `navigator.gpu` while `requestAdapter()` still resolves `null`
 * (no compatible adapter), and a WebGPU *session* can also fail to create at
 * runtime for reasons that have nothing to do with feature detection (driver
 * denylist, context loss, out of GPU memory). Neither of those is caught by a
 * property-existence check, and when they aren't caught, this app kept asking
 * `parakeet.js` for a WebGPU backend anyway.
 *
 * `detectAsrBackend()` actually requests an adapter, so a browser that merely
 * exposes the API without a working adapter still gets routed to WASM (and
 * the small, WASM-safe int8 encoder — see `model-manifest.ts`). Safari is
 * routed to WebGPU like everyone else now that the WebGPU variant is the
 * q4f16 encoder (516 MB, single file) rather than the fp32 one (2.44 GB
 * external data) that used to kill its WebContent process; a runtime WebGPU
 * failure still falls back to the next WebGPU encoder and then to WASM/int8
 * via `browser-asr.ts`.
 *
 * This module owns two pieces of session state: the detected backend (cached)
 * and the WebGPU encoder rung forced by a runtime failure. Both live here
 * because `model-manifest.ts` is deliberately pure data — the manifests say
 * what each variant *is*, and never what this page session has already
 * discovered about it.
 */

import { getAsrModelFamily } from './model-family';
import {
  PARAKEET_TDT_V3_WEBGPU,
  manifestForBackend,
  manifestForFamily,
  webgpuManifestForEncoder,
  WEBGPU_ENCODER_FALLBACKS,
  webgpuEncodersAvailable,
  type AsrBackend,
  type AsrModelManifest,
  type WebgpuEncoderQuant,
} from './model-manifest';

interface NavigatorGPU {
  requestAdapter?: () => Promise<unknown>;
}

/**
 * Whether this browser runs on WebKit's engine (Safari), as opposed to merely
 * exposing a WebGPU entry point.
 *
 * Same predicate `parakeet.ts` uses for its single-threaded session creation:
 * an Apple vendor without a Chrome/Chromium/Firefox/iOS-wrapper token. Kept
 * as a local copy (not imported) so this module stays dependency-free.
 */
export function isSafariEngine(): boolean {
  if (typeof navigator === 'undefined') return false;
  const vendor = (navigator as Navigator & { vendor?: string }).vendor ?? '';
  const ua = navigator.userAgent ?? '';
  return /apple/i.test(vendor) && !/chrome|chromium|crios|fxios|edg/i.test(ua);
}

function getNavigatorGpu(): NavigatorGPU | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as unknown as { gpu?: NavigatorGPU }).gpu;
}

/**
 * The device's reported RAM in GiB, or `null` when the browser doesn't
 * report it.
 *
 * `navigator.deviceMemory` is a Chromium thing and rounds to a power of two
 * (`0.25, 0.5, 1, 2, 4, 8`). Safari does not implement it, so on Safari this
 * is always `null` and the guard below simply doesn't apply — Safari does not
 * need it, having already been routed to WASM above.
 */
function getDeviceMemoryGiB(): number | null {
  if (typeof navigator === 'undefined') return null;
  const value = (navigator as unknown as { deviceMemory?: unknown }).deviceMemory;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

/**
 * Below this much reported RAM, a WebGPU adapter is not worth taking: the
 * WebGPU default is the q4f16 encoder (534 MB — see `model-manifest.ts`) and
 * its fallback rung is the 1.24 GB fp16 one, and a 2 GB device cannot hold
 * either plus the browser's own copy of the same weights. The int8/WASM
 * variant is a ~670 MB single file, which fits.
 *
 * Not a heuristic about *this* app's speed — a refusal to start an allocation
 * that will be killed mid-way. On a device that reports its memory, choosing
 * the small model up front is the difference between a working recorder and a
 * tab that disappears.
 */
const MIN_GIB_FOR_WEBGPU_MODEL = 4;

async function probeAsrBackend(): Promise<AsrBackend> {
  // Safari takes the WebGPU manifest like everyone else: since the WebGPU
  // variant became the q4f16 encoder (516 MB single file, self-hosted — see
  // `model-manifest.ts`), the 2.44 GB fp32 encoder that used to kill its
  // WebContent process is gone from this path entirely. What remains
  // Safari-specific is only the adapter probe below, which is a real
  // `requestAdapter()` call rather than a `'gpu' in navigator` guess.
  //
  // `parakeet.js`'s `hub.js` force-upgrade (`int8` -> `fp32` on any `webgpu*`
  // backend) does not apply here — the app resolves its own files and calls
  // `ParakeetModel.fromUrls` directly, which takes whatever encoder URL it is
  // handed — and the manifest states `q4f16` explicitly anyway, so there is
  // nothing to upgrade. A WebGPU session that still fails at runtime walks
  // `WEBGPU_ENCODER_FALLBACKS` and then falls to WASM/int8 in
  // `browser-asr.ts`, guarded by the crash-loop marker. Chrome gets the same
  // default and the same chain — the q4f16 file is unbenched on Chrome (§2 of
  // the bench results could not run it), which is exactly what the fp16 rung
  // is there for.
  // No hosted WebGPU encoder (the default in a production build): the CPU
  // model is the best variant that is actually downloadable. Nemotron has its
  // own hosted WebGPU files, so only Parakeet is routed away.
  if (getAsrModelFamily() !== 'nemotron' && !webgpuEncodersAvailable()) return 'wasm';
  const deviceMemory = getDeviceMemoryGiB();
  if (deviceMemory !== null && deviceMemory < MIN_GIB_FOR_WEBGPU_MODEL) {
    console.info(
      `[asr] ${deviceMemory} GiB of RAM reported — using the smaller CPU model ` +
        `instead of the ${PARAKEET_TDT_V3_WEBGPU.fallbackSizeBytes}-byte WebGPU one.`,
    );
    return 'wasm';
  }
  const gpu = getNavigatorGpu();
  if (!gpu || typeof gpu.requestAdapter !== 'function') return 'wasm';
  try {
    const adapter = await gpu.requestAdapter();
    return adapter ? 'webgpu' : 'wasm';
  } catch {
    return 'wasm';
  }
}

/** Cached detection result — an adapter request is real async work, and the
 *  answer cannot change within a page session. `null` forces a fresh check
 *  (used after a runtime WebGPU failure, and by tests). */
let cachedBackend: Promise<AsrBackend> | null = null;

/**
 * Resolve which backend this device/browser can actually use. Cached after
 * the first call — see `forceWasmBackend()` for the one case that needs to
 * override it mid-session.
 */
export function detectAsrBackend(): Promise<AsrBackend> {
  if (!cachedBackend) cachedBackend = probeAsrBackend();
  return cachedBackend;
}

/**
 * Force every subsequent `detectAsrBackend()` call (for the rest of this page
 * session) to resolve `'wasm'`. Used when every WebGPU encoder in
 * `WEBGPU_ENCODER_FALLBACKS` has failed to create a session at runtime despite
 * an adapter having been available — the detection step alone cannot catch
 * that, only an actual load attempt can, so this is the caller
 * (browser-asr.ts) reporting that failure back.
 *
 * Note what the caller owes the user afterwards: the CPU model is not a live
 * transcription path (RTF 1.41 — see `model-manifest.ts`), so a session that
 * lands here buffers and transcribes after Stop rather than pretending.
 */
export function forceWasmBackend(): void {
  cachedBackend = Promise.resolve('wasm');
  forcedEncoder = null;
}

/**
 * The WebGPU encoder rung this page session is on — the first entry of
 * `WEBGPU_ENCODER_FALLBACKS` until a load failure forces the next one down.
 */
let forcedEncoder: WebgpuEncoderQuant | null = null;

/** Which WebGPU encoder this page session will try next. */
export function activeWebgpuEncoder(): WebgpuEncoderQuant {
  return forcedEncoder ?? WEBGPU_ENCODER_FALLBACKS[0] ?? 'q4f16';
}

/**
 * The manifest this page session should try *now*, for a detected backend.
 *
 * The only place the forced rung is applied, so every caller — the load path,
 * the registry registration, the consent dialog's size — reads the same
 * variant. Reading `manifestForBackend()` directly would ignore a downgrade and
 * quietly re-ask for the encoder that just failed.
 */
export function activeAsrManifest(backend: AsrBackend): AsrModelManifest {
  // Nemotron has one WebGPU variant, so there is no encoder rung to apply.
  if (getAsrModelFamily() === 'nemotron') return manifestForFamily('nemotron', backend);
  if (backend === 'wasm' || !webgpuEncodersAvailable()) return manifestForBackend('wasm');
  return webgpuManifestForEncoder(activeWebgpuEncoder());
}

/**
 * Move this page session down the WebGPU fallback order: the next encoder
 * after the one that just failed to create a session. Returns the manifest
 * now in play, or `null` when the chain is exhausted (in which case the caller
 * must `forceWasmBackend()`).
 */
export function forceNextWebgpuEncoder(
  failed: WebgpuEncoderQuant,
): AsrModelManifest | null {
  // The encoder ladder is Parakeet's; Nemotron's WebGPU failure goes to WASM.
  if (getAsrModelFamily() === 'nemotron') return null;
  const index = WEBGPU_ENCODER_FALLBACKS.indexOf(failed);
  const next = index < 0 ? null : WEBGPU_ENCODER_FALLBACKS[index + 1];
  if (!next) return null;
  forcedEncoder = next;
  return webgpuManifestForEncoder(next);
}

/** Test-only: clear the cached detection so the next call probes again. */
export function resetAsrBackendDetectionForTests(): void {
  cachedBackend = null;
  forcedEncoder = null;
}
