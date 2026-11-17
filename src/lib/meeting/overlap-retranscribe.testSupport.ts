import { pushOverlapAudio, resetOverlapRetranscribe, setOverlapTranscriber } from './overlap-retranscribe';
import * as storeSessionReset from './session-reset';

export const SR = 16_000;

export const turns = [
  { speaker: 'mic:0', start: 1, end: 4 },
  { speaker: 'mic:1', start: 3, end: 6 },
];

export function pushSeconds(from: number, seconds: number): void {
  for (let t = from; t < from + seconds - 1e-9; t += 0.1) {
    pushOverlapAudio('mic', new Int16Array(1600).fill(1000).buffer, Math.round(t * SR));
  }
}

export const tick = () => new Promise((r) => setTimeout(r, 0));

export function resetOverlapState(): void {
  setOverlapTranscriber(null);
  resetOverlapRetranscribe();
  storeSessionReset.resetSession('mic');
}
