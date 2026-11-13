import { vi } from 'vitest';
import { FakeAudioWorkletNode, installBrowserStubs, uninstallBrowserStubs } from './index.testUtils';
import type { RaceHarness } from './types/race-harness';

const ASR_MOCKED_MODULES = [
  './asr/backend',
  './asr/live-push',
  './asr/recording-mode',
  './asr/live-flush',
  './asr/reset',
  './asr/engine-acquire',
  './asr/post-stop-run',
  './asr/controls',
  './post-stop-progress',
];

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
  const overrides: Record<string, Record<string, unknown>> = {
    './asr/backend': { resolveAsrBackend: harness.asr.resolveAsrBackend, isPostStopTranscriptionOnly: () => harness.backend === 'wasm' },
    './asr/live-push': { pushLiveAudio: harness.asr.pushLiveAudio },
    './asr/recording-mode': { bufferRecordedAudio: harness.asr.bufferRecordedAudio },
    './asr/live-flush': { flushLiveAudio: harness.asr.flushLiveAudio },
    './asr/reset': { resetBrowserASR: harness.asr.resetBrowserASR },
    './asr/engine-acquire': { ensureBrowserASRReady: harness.asr.ensureBrowserASRReady },
    './asr/post-stop-run': { transcribeRecordedAudioAfterStop: harness.asr.transcribeRecordedAudioAfterStop },
    './asr/controls': { getBrowserASREnabled: () => true },
    './post-stop-progress': { isPostStopTranscriptionRunning: () => false },
  };
  for (const [path, fakes] of Object.entries(overrides)) {
    vi.doMock(path, async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), ...fakes }));
  }
  vi.doMock('./diarization-bridge', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./diarization-bridge')>()),
    startDiarization: harness.startDiarization,
  }));
  return harness;
}

export function uninstallRaceHarness(): void {
  for (const path of ASR_MOCKED_MODULES) vi.doUnmock(path);
  vi.doUnmock('./diarization-bridge');
  uninstallBrowserStubs();
}
