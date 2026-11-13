import { getBrowserASREnabled } from './asr/controls';
import { pushDiarizationAudio } from './diarization-bridge';
import { captureClock, frameFeed } from './diagnostics';
import { pushLangIdAudio } from './langid-bridge';
import { pushOverlapAudio } from './overlap-retranscribe';
import { session } from './session-state';
import { routeAsrFrame } from './transcription-mode';
import type { Source } from './types';

export function routeCapturedFrame(source: Source, pcm: ArrayBuffer): void {
  if (session.paused || session.sessionOver) return;
  const at = captureClock.get(source) ?? 0;
  captureClock.set(source, at + (pcm.byteLength >> 1));
  const fed = frameFeed.get(source) ?? { captured: 0, toAsr: 0 };
  fed.captured += 1;
  frameFeed.set(source, fed);
  if (getBrowserASREnabled()) {
    fed.toAsr += 1;
    routeAsrFrame(source, pcm, at);
  }
  pushOverlapAudio(source, pcm, at);
  pushDiarizationAudio(source, pcm, at);
  pushLangIdAudio(source, pcm);
}
