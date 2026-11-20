import { routeCapturedFrame } from '@/lib/meeting/frame-router';
import type { MeetingAsr } from '../types/meeting-engine';
import { diarCores, diarIdle } from './diar-cores';
import { loadFakeWorker } from './diar-fake-worker';
import { assertLiveMode, flushLiveSpeakers, resetLiveSession, waitActive } from './diar-session';

const ACTIVE_TIMEOUT_MS = 120_000;

async function startSpeakers(): Promise<void> {
  await loadFakeWorker();
  await resetLiveSession();
  diarCores.clear();
  const { createDiarizers } = await import('@/lib/meeting/diarization-create');
  const { stopDiarizationForSource } = await import('@/lib/meeting/diarization-bridge');
  createDiarizers(['mic', 'system'], stopDiarizationForSource);
  await waitActive(ACTIVE_TIMEOUT_MS);
  await assertLiveMode();
}

export function withLiveSpeakers(asr: MeetingAsr): MeetingAsr {
  return {
    ...asr,
    route: routeCapturedFrame,
    startSpeakers,
    settleSpeakers: diarIdle,
    flushSpeakers: () => flushLiveSpeakers(asr.flushLiveAudio),
  };
}
