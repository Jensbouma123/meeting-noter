import { CAPTURE_SAMPLE_RATE } from '../pcm';
import type { EchoFrames } from '../types/echo-frames';

export const ECHO_FRAME_SAMPLES = 160;
export const ECHO_BAND_CENTERS_HZ = [250, 500, 1000, 2000, 4000] as const;
const BANDS = ECHO_BAND_CENTERS_HZ.length;
const RING_FRAMES = 6000;
const Q = 1.4;
const CLOCK_JITTER = 800;

function bandpass(hz: number): Float64Array {
  const w = (2 * Math.PI * hz) / CAPTURE_SAMPLE_RATE;
  const alpha = Math.sin(w) / (2 * Q);
  const a0 = 1 + alpha;
  return Float64Array.of(alpha / a0, 0, -alpha / a0, (-2 * Math.cos(w)) / a0, (1 - alpha) / a0);
}

const COEFFS = ECHO_BAND_CENTERS_HZ.map(bandpass);

export class BandEnvelope {
  private readonly ring = new Float32Array(RING_FRAMES * BANDS);
  private readonly state = new Float64Array(BANDS * 4);
  private readonly acc = new Float64Array(BANDS);
  private next = -1;
  private filled = 0;
  private endFrame = 0;
  private validFrom = 0;

  push(samples: Float32Array, at?: number): void {
    const onClock = at === undefined || (this.next >= 0 && Math.abs(at - this.next) <= CLOCK_JITTER);
    const start = onClock ? Math.max(0, this.next) : at;
    if (this.next >= 0 && start !== this.next) this.reset();
    if (this.next < 0) this.begin(start);
    for (let i = 0; i < samples.length; i += 1) {
      const x = samples[i];
      for (let b = 0; b < BANDS; b += 1) {
        const c = COEFFS[b];
        const s = b * 4;
        const y = c[0] * x + c[1] * this.state[s] + c[2] * this.state[s + 1] - c[3] * this.state[s + 2] - c[4] * this.state[s + 3];
        this.state[s + 1] = this.state[s];
        this.state[s] = x;
        this.state[s + 3] = this.state[s + 2];
        this.state[s + 2] = y;
        this.acc[b] += y * y;
      }
      this.filled += 1;
      if (this.filled === ECHO_FRAME_SAMPLES) this.emit();
    }
    this.next = start + samples.length;
  }

  frames(fromFrame: number, toFrame: number): EchoFrames | null {
    const first = Math.max(fromFrame, this.coveredFrom);
    const last = Math.min(toFrame, this.endFrame);
    if (this.next < 0 || last <= first) return null;
    const power = new Float32Array((last - first) * BANDS);
    for (let f = first; f < last; f += 1) {
      const slot = (f % RING_FRAMES) * BANDS;
      power.set(this.ring.subarray(slot, slot + BANDS), (f - first) * BANDS);
    }
    return { firstFrame: first, frames: last - first, bands: BANDS, power };
  }

  get coveredFrom(): number {
    return Math.max(this.validFrom, this.endFrame - RING_FRAMES);
  }

  get coveredTo(): number {
    return this.endFrame;
  }

  private begin(start: number): void {
    this.next = start;
    this.endFrame = Math.floor(start / ECHO_FRAME_SAMPLES);
    this.validFrom = this.endFrame;
    this.filled = start - this.endFrame * ECHO_FRAME_SAMPLES;
  }

  private emit(): void {
    const slot = (this.endFrame % RING_FRAMES) * BANDS;
    for (let b = 0; b < BANDS; b += 1) {
      this.ring[slot + b] = this.acc[b] / ECHO_FRAME_SAMPLES;
      this.acc[b] = 0;
    }
    this.endFrame += 1;
    this.filled = 0;
  }

  private reset(): void {
    this.state.fill(0);
    this.acc.fill(0);
    this.next = -1;
    this.filled = 0;
    this.endFrame = 0;
  }
}
