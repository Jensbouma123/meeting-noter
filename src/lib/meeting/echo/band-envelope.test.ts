import { describe, expect, it } from 'vitest';
import { BandEnvelope, ECHO_BAND_CENTERS_HZ, ECHO_FRAME_SAMPLES } from './band-envelope';

const tone = (hz: number, samples: number): Float32Array =>
  Float32Array.from({ length: samples }, (_, i) => 0.3 * Math.sin((2 * Math.PI * hz * i) / 16_000));

describe('BandEnvelope', () => {
  it('puts a tone into the band around its frequency', () => {
    const env = new BandEnvelope();
    env.push(tone(1000, 16_000));
    const frames = env.frames(0, 200)!;
    expect(frames.frames).toBe(16_000 / ECHO_FRAME_SAMPLES);
    const last = frames.power.subarray((frames.frames - 1) * frames.bands, frames.frames * frames.bands);
    const loudest = last.indexOf(Math.max(...last));
    expect(ECHO_BAND_CENTERS_HZ[loudest]).toBe(1000);
  });

  it('follows a capture clock across small jitter and restarts after a real gap', () => {
    const env = new BandEnvelope();
    env.push(tone(500, 1600), 32_000);
    env.push(tone(500, 1600), 33_700);
    expect(env.coveredFrom).toBe(200);
    expect(env.coveredTo).toBe(220);
    env.push(tone(500, 1600), 160_000);
    expect(env.coveredFrom).toBe(1000);
    expect(env.coveredTo).toBe(1010);
  });
});
