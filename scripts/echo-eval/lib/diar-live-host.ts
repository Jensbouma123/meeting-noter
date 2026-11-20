import { routeCapturedFrame } from '@/lib/meeting/frame-router';
import type { MeetingAsr } from '../types/meeting-engine';
import { diarCores, diarIdle } from './diar-cores';
import { loadFakeWorker } from './diar-fake-worker';

const OVERLAP_FLUSH_TIMEOUT_MS = 120_000;
const ACTIVE_POLL_MS = 20;
const ACTIVE_TIMEOUT_MS = 120_000;

async function resetLiveSession(): Promise<void> {
  const { session } = await import('@/lib/meeting/session-state');
  const { resetDiarization } = await import('@/lib/meeting/diarization-bridge');
  const { resetOverlapRetranscribe } = await import('@/lib/meeting/overlap-retranscribe');
  const { beginSpeakerSession } = await import('@/lib/meeting/speaker-session');
  const { captureClock, frameFeed } = await import('@/lib/meeting/diagnostics');
  session.sessionOver = false;
  session.paused = false;
  resetDiarization();
  resetOverlapRetranscribe();
  beginSpeakerSession();
  captureClock.clear();
  frameFeed.clear();
  session.sessionPostStop = null;
  session.undecidedFrames = [];
  session.backendResolved = Promise.resolve();
}

async function waitActive(): Promise<void> {
  const { getState } = await import('@/lib/meeting/store-core');
  const until = Date.now() + ACTIVE_TIMEOUT_MS;
  while (getState().diarization?.phase !== 'active') {
    if (Date.now() > until) throw new Error(`diarizer never active: ${JSON.stringify(getState().diarization)}`);
    await new Promise((resolve) => setTimeout(resolve, ACTIVE_POLL_MS));
  }
}

async function startSpeakers(): Promise<void> {
  await loadFakeWorker();
  await resetLiveSession();
  diarCores.clear();
  const { createDiarizers } = await import('@/lib/meeting/diarization-create');
  const { stopDiarizationForSource } = await import('@/lib/meeting/diarization-bridge');
  createDiarizers(['mic', 'system'], stopDiarizationForSource);
  await waitActive();
  const { decideTranscriptionMode } = await import('@/lib/meeting/transcription-mode');
  if (await decideTranscriptionMode()) throw new Error('session decided post-stop transcription; live path expected');
}

export function withLiveSpeakers(asr: MeetingAsr): MeetingAsr {
  return {
    ...asr,
    route: routeCapturedFrame,
    startSpeakers,
    settleSpeakers: diarIdle,
    flushSpeakers: async () => {
      const { flushDiarization, stopDiarization } = await import('@/lib/meeting/diarization-bridge');
      const overlap = await import('@/lib/meeting/overlap-retranscribe');
      await Promise.all([asr.flushLiveAudio(), flushDiarization()]);
      await overlap.flushOverlapRetranscribe(OVERLAP_FLUSH_TIMEOUT_MS);
      overlap.resetOverlapRetranscribe();
      stopDiarization();
    },
  };
}
