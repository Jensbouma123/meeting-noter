import { getAsrModelFamily } from './model-family';
import { probeAsrBackend } from './backend-probe';
import {
  manifestForBackend,
  manifestForFamily,
  webgpuManifestForEncoder,
  WEBGPU_ENCODER_FALLBACKS,
  webgpuEncodersAvailable,
  type AsrBackend,
  type AsrModelManifest,
  type WebgpuEncoderQuant,
} from './model-manifest';

let cachedBackend: Promise<AsrBackend> | null = null;
let forcedEncoder: WebgpuEncoderQuant | null = null;

export function detectAsrBackend(): Promise<AsrBackend> {
  if (!cachedBackend) cachedBackend = probeAsrBackend();
  return cachedBackend;
}

export function forceWasmBackend(): void {
  cachedBackend = Promise.resolve('wasm');
  forcedEncoder = null;
}

export function activeWebgpuEncoder(): WebgpuEncoderQuant {
  return forcedEncoder ?? WEBGPU_ENCODER_FALLBACKS[0] ?? 'q4f16';
}

export function activeAsrManifest(backend: AsrBackend): AsrModelManifest {
  if (getAsrModelFamily() === 'nemotron') return manifestForFamily('nemotron', backend);
  if (backend === 'wasm' || !webgpuEncodersAvailable()) return manifestForBackend('wasm');
  return webgpuManifestForEncoder(activeWebgpuEncoder());
}

export function forceNextWebgpuEncoder(failed: WebgpuEncoderQuant): AsrModelManifest | null {
  if (getAsrModelFamily() === 'nemotron') return null;
  const index = WEBGPU_ENCODER_FALLBACKS.indexOf(failed);
  const next = index < 0 ? null : WEBGPU_ENCODER_FALLBACKS[index + 1];
  if (!next) return null;
  forcedEncoder = next;
  return webgpuManifestForEncoder(next);
}

export function resetAsrBackendDetectionForTests(): void {
  cachedBackend = null;
  forcedEncoder = null;
}
