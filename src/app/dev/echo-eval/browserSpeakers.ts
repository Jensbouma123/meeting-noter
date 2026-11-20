import { startDiarization } from '@/lib/meeting/diarization-bridge';
import { DIARIZATION_REGISTRY_KEY } from '@/lib/meeting/diarization-registry';
import { routeCapturedFrame } from '@/lib/meeting/frame-router';
import { getState } from '@/lib/meeting/store-core';
import { acceptEvalModels } from './acceptEvalModels';
import type { MeetingAsr } from '../../../../scripts/echo-eval/types/meeting-engine';
import { assertLiveMode, flushLiveSpeakers, resetLiveSession, waitActive } from '../../../../scripts/echo-eval/lib/diar-session';

const ACTIVE_TIMEOUT_MS = 600_000;
const FRAME_SECONDS = 0.1;

export function withBrowserSpeakers(asr: MeetingAsr, onBackend: (backend: string) => void): MeetingAsr {
  let startedAt = 0;
  let systemFrames = 0;
  return {
    ...asr,
    route: (source, frame) => {
      if (source === 'system') systemFrames += 1;
      routeCapturedFrame(source, frame);
    },
    startSpeakers: async () => {
      await resetLiveSession();
      acceptEvalModels([DIARIZATION_REGISTRY_KEY]);
      startDiarization(['mic', 'system']);
      await waitActive(ACTIVE_TIMEOUT_MS);
      await assertLiveMode();
      onBackend(getState().diarization?.backend ?? 'unknown');
      startedAt = performance.now();
      systemFrames = 0;
    },
    settleSpeakers: async () => {
      const wait = startedAt + systemFrames * FRAME_SECONDS * 1000 - performance.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    },
    flushSpeakers: () => flushLiveSpeakers(asr.flushLiveAudio),
  };
}
