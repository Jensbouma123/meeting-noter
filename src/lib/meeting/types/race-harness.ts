import type { vi } from 'vitest';

type Fake = ReturnType<typeof vi.fn>;

export interface AsrFakes {
  resolveAsrBackend: Fake;
  pushLiveAudio: Fake;
  bufferRecordedAudio: Fake;
  flushLiveAudio: Fake;
  resetBrowserASR: Fake;
  ensureBrowserASRReady: Fake;
  transcribeRecordedAudioAfterStop: Fake;
}

export interface RaceHarness {
  backend: 'webgpu' | 'wasm' | null;
  asr: AsrFakes;
  startDiarization: Fake;
}
