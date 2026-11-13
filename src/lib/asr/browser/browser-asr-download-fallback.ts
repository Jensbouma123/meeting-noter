import { activeAsrManifest, forceNextWebgpuEncoder, forceWasmBackend } from './backend-detect';
import { webgpuEncoderOf } from './model-manifest-selection';
import { registerManifest } from './model-registry-register';
import type { ModelEntry } from './types/model-registry';
import { manifestForEntry } from './browser-asr-download-sizes';

export function fallBackAfterMissingEncoder(entry: ModelEntry, err: unknown): boolean {
  if ((entry.kind ?? 'asr') !== 'asr') return false;
  const failed = manifestForEntry(entry);
  const failedEncoder = failed.engine === 'parakeet' ? webgpuEncoderOf(failed) : null;
  if (failedEncoder === null) return false;
  const message = err instanceof Error ? err.message : String(err);
  if (!/\b404\b/.test(message)) return false;

  let next = forceNextWebgpuEncoder(failedEncoder);
  if (next === null) {
    forceWasmBackend();
    next = activeAsrManifest('wasm');
  }
  const notice =
    `The ${failedEncoder.toUpperCase()} speech model isn't available here, so this uses the ` +
    `${next.asrBackend === 'wasm' ? 'CPU' : next.encoderQuant.toUpperCase()} model instead.`;
  registerManifest(next, notice);
  console.warn(`[asr] ${failedEncoder} encoder not found (404), falling back to ${next.variant}`);
  return true;
}
