import {
  appendPostStopAudio,
  beginPostStopCapture,
  clearPostStopCapture,
} from '../post-stop-buffer';
import type { RecordingMode } from '../types/asr-state';
import type { Source } from '../types/basics';
import { MAX_UNDECIDED_SAMPLES } from './constants';
import { asrState } from './state';
import { clearLiveFeed } from './live-feed';
import { pushLiveAudio } from './live-push';

function holdUndecidedFrame(source: Source, pcm: ArrayBuffer, startSample?: number): void {
  asrState.undecidedFrames.push({ source, pcm, startSample });
  asrState.undecidedSamples += pcm.byteLength / 2;
  while (asrState.undecidedSamples > MAX_UNDECIDED_SAMPLES && asrState.undecidedFrames.length > 0) {
    asrState.undecidedSamples -= (asrState.undecidedFrames.shift() as { pcm: ArrayBuffer }).pcm.byteLength / 2;
  }
}

export function dropUndecidedFrames(): void {
  asrState.undecidedFrames = [];
  asrState.undecidedSamples = 0;
}

export function settleRecordingMode(): void {
  if (asrState.recordingMode !== null || asrState.activeBackend === null) return;
  const mode: RecordingMode = asrState.activeBackend === 'wasm' ? 'post-stop' : 'live';
  asrState.recordingMode = mode;
  const held = asrState.undecidedFrames;
  dropUndecidedFrames();
  if (mode === 'live') clearPostStopCapture();
  for (const f of held) {
    if (mode === 'post-stop') appendPostStopAudio(f.source, f.pcm);
    else pushLiveAudio(f.source, f.pcm, f.startSample);
  }
}

export function beginRecordedAudioCapture(): void {
  beginPostStopCapture();
  clearLiveFeed();
  asrState.recordingMode = null;
  dropUndecidedFrames();
  settleRecordingMode();
}

export function bufferRecordedAudio(source: Source, pcm: ArrayBuffer, startSample?: number): void {
  settleRecordingMode();
  if (asrState.recordingMode === 'post-stop') {
    appendPostStopAudio(source, pcm);
  } else if (asrState.recordingMode === null) {
    holdUndecidedFrame(source, pcm, startSample);
  }
}

export function getRecordingTranscriptionMode(): RecordingMode | null {
  settleRecordingMode();
  return asrState.recordingMode;
}
