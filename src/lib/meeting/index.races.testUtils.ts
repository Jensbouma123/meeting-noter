import { vi } from 'vitest';
import { FakeAudioWorkletNode, installBrowserStubs, uninstallBrowserStubs } from './index.testUtils';

export interface AsrFakes {
  resolveAsrBackend: ReturnType<typeof vi.fn>;
  pushLiveAudio: ReturnType<typeof vi.fn>;
  bufferRecordedAudio: ReturnType<typeof vi.fn>;
  flushLiveAudio: ReturnType<typeof vi.fn>;
  resetBrowserASR: ReturnType<typeof vi.fn>;
  ensureBrowserASRReady: ReturnType<typeof vi.fn>;
  transcribeRecordedAudioAfterStop: ReturnType<typeof vi.fn>;
}

export interface RaceHarness {
  backend: 'webgpu' | 'wasm' | null;
  asr: AsrFakes;
  startDiarization: ReturnType<typeof vi.fn>;
}

export function installRaceHarness(): RaceHarness {
  installBrowserStubs();
  FakeAudioWorkletNode.instances.length = 0;
  vi.resetModules();
  const harness: RaceHarness = {
    backend: 'wasm',
    asr: {
      resolveAsrBackend: vi.fn(async () => harness.backend),
      pushLiveAudio: vi.fn(),
      bufferRecordedAudio: vi.fn(),
      flushLiveAudio: vi.fn(async () => {}),
      resetBrowserASR: vi.fn(),
      ensureBrowserASRReady: vi.fn(async () => true),
      transcribeRecordedAudioAfterStop: vi.fn(async () => true),
    },
    startDiarization: vi.fn(),
  };
  vi.doMock('./browser-asr', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./browser-asr')>()),
    ...harness.asr,
    getBrowserASREnabled: () => true,
    isPostStopTranscriptionOnly: () => harness.backend === 'wasm',
    isPostStopTranscriptionRunning: () => false,
  }));
  vi.doMock('./diarization-bridge', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./diarization-bridge')>()),
    startDiarization: harness.startDiarization,
  }));
  return harness;
}

export function uninstallRaceHarness(): void {
  vi.doUnmock('./browser-asr');
  vi.doUnmock('./diarization-bridge');
  uninstallBrowserStubs();
}
