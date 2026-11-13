import { CAPTURE_SAMPLE_RATE } from '../pcm';

export const PARQUET_REGISTRY_KEY = 'parakeet-ttd';

export const WASM_FALLBACK_DESCRIPTION =
  'Your browser could not run the fast (WebGPU) version of this model, so this device will use ' +
  'a smaller, CPU-only version instead — a fresh download is needed. It is too slow to transcribe ' +
  'while you talk, so your recording is transcribed after you stop it. Downloaded once and cached ' +
  'in your browser — audio never leaves this machine.';

export const SMALL_MODEL_AFTER_CRASH_DESCRIPTION =
  'The previous model load crashed this tab, so this device will use a smaller, ' +
  'CPU-only version instead — a fresh download is needed. Downloaded once and cached ' +
  'in your browser — audio never leaves this machine.';

export const POST_STOP_MESSAGE =
  'Live transcription is not supported on this device - the recording will be transcribed after you stop';

export const CRASHED_LOAD_MESSAGE =
  'The previous model load crashed the tab before it could finish. ' +
  'Retry with the smaller CPU-only model below — it needs far less memory. ' +
  'Pressing Record instead tries the same model again.';

export const ASR_LOAD_MARKER_KEY = 'mn.asr-load-in-progress.v1';
export const LOAD_MARKER_MAX_AGE_MS = 15 * 60 * 1000;

export const MAX_UNDECIDED_SAMPLES = 2 * 60 * CAPTURE_SAMPLE_RATE;
export const POST_STOP_MIN_PART_SAMPLES = CAPTURE_SAMPLE_RATE * 2;

export const LOW_CONFIDENCE_THRESHOLD = 0.65;

export const OVERLAP_CLIP_MAX_SECONDS = 8;
export const OVERLAP_CLIP_WAIT_MS = 1000;

export const LIVE_FLUSH_WAIT_MS = 30_000;
export const LIVE_FLUSH_MAX_WINDOWS = 6;
export const LIVE_FLUSH_POLL_MS = 50;
