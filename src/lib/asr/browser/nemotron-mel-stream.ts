import { NEMOTRON } from './nemotron-constants';
import { slaneyFilterbank } from './nemotron-mel-filterbank';
import { createPowerSpectrum } from './nemotron-power-spectrum';

export class NemotronMelStream {
  private readonly fb = slaneyFilterbank();
  private readonly window: Float32Array;
  private readonly power = createPowerSpectrum(NEMOTRON.nFft);
  private overlap = new Float32Array(NEMOTRON.nFft / 2);
  private lastSample = 0;

  constructor() {
    const { win } = NEMOTRON;
    this.window = new Float32Array(win);
    for (let n = 0; n < win; n++) this.window[n] = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (win - 1));
  }

  reset(): void {
    this.overlap = new Float32Array(NEMOTRON.nFft / 2);
    this.lastSample = 0;
  }

  process(chunk: Float32Array): { mel: Float32Array; frames: number } {
    const { nFft, hop, win, nMels, preemph, logEps } = NEMOTRON;
    const pad = nFft / 2;
    const winOffset = (nFft - win) / 2;
    const n = chunk.length;
    const padded = new Float32Array(pad + n + winOffset);
    padded.set(this.overlap, 0);
    let prev = this.lastSample;
    for (let i = 0; i < n; i++) {
      padded[pad + i] = chunk[i] - preemph * prev;
      prev = chunk[i];
    }
    this.lastSample = n > 0 ? chunk[n - 1] : this.lastSample;
    this.overlap = padded.slice(n, n + pad);

    const frames = Math.floor((padded.length - winOffset - win) / hop) + 1;
    const mel = new Float32Array(frames * nMels);
    const frame = new Float32Array(nFft);
    const spec = new Float32Array(nFft / 2 + 1);
    for (let t = 0; t < frames; t++) {
      const base = t * hop + winOffset;
      for (let i = 0; i < win; i++) frame[i] = padded[base + i] * this.window[i];
      frame.fill(0, win);
      this.power(frame, spec);
      for (let m = 0; m < nMels; m++) {
        const w = this.fb.weights[m];
        const s = this.fb.start[m];
        let v = 0;
        for (let k = 0; k < w.length; k++) v += w[k] * spec[s + k];
        mel[t * nMels + m] = Math.log(v + logEps);
      }
    }
    return { mel, frames };
  }
}
