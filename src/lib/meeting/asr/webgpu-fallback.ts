import {
  forceNextWebgpuEncoder,
  forceWasmBackend,
  openDialog,
  registerDefaultModels,
  registerManifest,
  type WebgpuEncoderQuant,
  resetConsent,
} from '@/lib/asr/browser';
import { WASM_FALLBACK_DESCRIPTION } from './constants';
import { notifyBrowserListeners } from './listeners';
import { recordFailure } from './state-updates';

export function stepDownAfterWebgpuFailure(failedEncoder: WebgpuEncoderQuant, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  const nextManifest = forceNextWebgpuEncoder(failedEncoder);
  if (nextManifest !== null) {
    registerManifest(nextManifest);
    resetConsent();
    openDialog();
    console.error(
      `[asr] WebGPU ${failedEncoder} session creation failed, trying ${nextManifest.encoderQuant}`,
      err,
    );
    recordFailure(
      'load',
      `Could not start the model on this device using WebGPU (${message}). ` +
        `Falling back to the ${nextManifest.encoderQuant.toUpperCase()} model — confirm the new ` +
        'download to continue using on-device transcription.',
    );
    notifyBrowserListeners();
    return;
  }

  forceWasmBackend();
  registerDefaultModels('wasm', WASM_FALLBACK_DESCRIPTION);
  resetConsent();
  openDialog();

  console.error(
    '[asr] Every WebGPU encoder failed to create a session, falling back to CPU-only',
    err,
  );
  recordFailure(
    'load',
    `Could not start the model on this device using WebGPU (${message}). ` +
      'Falling back to a CPU-only model, which is too slow to transcribe while you talk — your ' +
      'recording will be transcribed after you stop. Confirm the new download to continue.',
  );
  notifyBrowserListeners();
}
