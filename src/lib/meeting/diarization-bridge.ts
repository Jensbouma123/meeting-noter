import { getModelStatus, isConsentGiven, retryDownload } from '@/lib/asr/browser';
import { setSpeakerLabeler, setSpeakerTimeline } from './asr/speaker';
import { createDiarizers } from './diarization-create';
import { clearWaiting, unavailableReason, waitForDownload } from './diarization-download-wait';
import { DIARIZATION_REGISTRY_KEY } from './diarization-registry';
import {
  activeDiarizers,
  currentSpeaker,
  downloadWait,
  heardUntil,
  latestTurnEnd,
  setDiarizationStatus,
  waitingSources,
} from './diarization-session';
import { clearTurns } from './diarization-turns';
import { int16ToFloat32 } from './pcm';
import { setOverlapTimeline } from './speaker-overlap-timeline';
import { getState } from './store-core';
import type { Source } from './types';

export function stopDiarizationForSource(source: Source): void {
  waitingSources.delete(source);
  if (waitingSources.size === 0) clearWaiting();
  const diarizer = activeDiarizers.get(source);
  if (!diarizer) return;
  diarizer.dispose();
  activeDiarizers.delete(source);
  if (activeDiarizers.size === 0 && !downloadWait.stop) setDiarizationStatus({ phase: 'off', reason: null });
}

function startReadySources(sources: readonly Source[]): void {
  createDiarizers(sources, stopDiarizationForSource);
}

export function startDiarization(sources: readonly Source[]): void {
  const entry = getModelStatus(DIARIZATION_REGISTRY_KEY);
  if (!entry || !isConsentGiven(DIARIZATION_REGISTRY_KEY)) {
    setDiarizationStatus({
      phase: 'unavailable',
      reason: 'Speaker detection is not downloaded — download it in Settings to label speakers.',
    });
    return;
  }
  if (entry.status === 'downloading' || entry.status === 'not-downloaded') {
    waitForDownload(sources, startReadySources);
    if (entry.status === 'not-downloaded') void retryDownload(DIARIZATION_REGISTRY_KEY).catch(() => {});
    return;
  }
  if (entry.status !== 'cached') {
    setDiarizationStatus({ phase: 'unavailable', reason: unavailableReason(entry.status, entry.error) });
    return;
  }
  startReadySources(sources);
}

export function pushDiarizationAudio(source: Source, pcm: ArrayBuffer, startSample?: number): void {
  const diarizer = activeDiarizers.get(source);
  if (!diarizer || pcm.byteLength < 2) return;
  if (startSample !== undefined) heardUntil.set(source, (startSample + (pcm.byteLength >> 1)) / 16_000);
  diarizer.push(int16ToFloat32(pcm), startSample);
}

export async function flushDiarization(): Promise<void> {
  await Promise.all([...activeDiarizers.values()].map((d) => d.flush()));
}

export function stopDiarization(): void {
  clearWaiting();
  for (const diarizer of activeDiarizers.values()) {
    diarizer.dispose();
  }
  activeDiarizers.clear();
  if (getState().diarization?.phase !== 'off') setDiarizationStatus({ phase: 'off', reason: null });
}

export function resetDiarization(): void {
  stopDiarization();
  clearTurns();
  currentSpeaker.clear();
  latestTurnEnd.clear();
  heardUntil.clear();
  downloadWait.redownloadedThisSession = false;
  setSpeakerLabeler(null);
  setSpeakerTimeline(null);
  setOverlapTimeline(null);
}
