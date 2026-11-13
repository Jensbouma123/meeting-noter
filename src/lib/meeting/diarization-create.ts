import { markNotCached, retryDownload } from '@/lib/asr/browser';
import { createDiarizer } from '@/lib/diarization/browser';
import { setSpeakerLabeler, setSpeakerTimeline } from './asr/speaker';
import { waitForDownload } from './diarization-download-wait';
import { DIARIZATION_REGISTRY_KEY } from './diarization-registry';
import {
  activeDiarizers,
  downloadWait,
  labelFor,
  setDiarizationStatus,
} from './diarization-session';
import { diarizationTimeline } from './diarization-timeline';
import { overlapsIn } from './diarization-overlaps';
import { onTurn } from './diarization-turn-intake';
import { setOverlapTimeline } from './speaker-overlap-timeline';
import { getState, setState } from './store';
import type { Source } from './types';

export function createDiarizers(sources: readonly Source[], stopSource: (source: Source) => void): void {
  for (const source of sources) {
    if (activeDiarizers.has(source)) continue;
    const diarizer = createDiarizer({ source });
    diarizer.onSpeakerTurn(onTurn);
    diarizer.onReady(({ backend }) => {
      if (activeDiarizers.get(source) !== diarizer) return;
      setDiarizationStatus({ phase: 'active', reason: null, backend });
    });
    diarizer.onError((message, code) => {
      if (activeDiarizers.get(source) !== diarizer) return;
      stopSource(source);
      if (code === 'not-cached' && (!downloadWait.redownloadedThisSession || downloadWait.stop)) {
        const first = !downloadWait.redownloadedThisSession;
        downloadWait.redownloadedThisSession = true;
        if (first) markNotCached(DIARIZATION_REGISTRY_KEY, message);
        waitForDownload([source], (ready) => createDiarizers(ready, stopSource));
        if (first) void retryDownload(DIARIZATION_REGISTRY_KEY).catch(() => {});
        return;
      }
      setState({ warning: `Speaker detection unavailable: ${message}` });
      if (activeDiarizers.size === 0) setDiarizationStatus({ phase: 'unavailable', reason: message });
    });
    activeDiarizers.set(source, diarizer);
  }
  if (activeDiarizers.size > 0) {
    setSpeakerLabeler(labelFor);
    setSpeakerTimeline(diarizationTimeline);
    setOverlapTimeline(overlapsIn);
    if (getState().diarization?.phase !== 'active') setDiarizationStatus({ phase: 'loading', reason: null });
  }
}
