import { detectAsrBackend, registerDefaultModels, type AsrBackend } from '@/lib/asr/browser';
import { asrState } from './state';
import { settleRecordingMode } from './recording-mode';

export function isWebGPUAvailable(): boolean {
  if (typeof navigator === 'undefined') return false;
  const gpu = (navigator as { gpu?: unknown }).gpu;
  return gpu !== undefined && gpu !== null;
}

export function recordDetectedBackend(backend: AsrBackend): void {
  asrState.activeBackend = backend;
  settleRecordingMode();
}

export function resolveAsrBackend(): Promise<AsrBackend> {
  return detectAsrBackend().then((backend) => {
    recordDetectedBackend(backend);
    registerDefaultModels(backend);
    return backend;
  });
}

export function shouldBufferForPostStop(): boolean {
  return asrState.activeBackend !== 'webgpu';
}

export function isPostStopTranscriptionOnly(): boolean {
  return asrState.activeBackend === 'wasm';
}
