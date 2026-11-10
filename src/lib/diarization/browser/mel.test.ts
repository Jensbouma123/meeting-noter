import { describe, expect, it } from 'vitest';
import { MelFrontend, slaneyMelFilterbank } from './mel';

/**
 * Reference values from transformers' `NemotronAsrStreamingFeatureExtractor`
 * with the model repo's `preprocessor_config.json` (torch 2.x, librosa
 * filters), on the signal `tones()` builds. On 20 s of real meeting audio fed
 * in odd-sized pieces the frontend matched that extractor to 1e-5.
 */

function tones(): Float32Array {
  const out = new Float32Array(8000);
  for (let i = 0; i < out.length; i += 1) {
    const t = i / 16000;
    out[i] = 0.5 * Math.sin(2 * Math.PI * 1000 * t) + 0.1 * Math.sin(2 * Math.PI * 300 * t);
  }
  return out;
}

function concat(parts: Float32Array[]): Float32Array {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function melAll(audio: Float32Array, pieceSizes: number[] = [audio.length]): Float32Array {
  const mel = new MelFrontend();
  const parts: Float32Array[] = [];
  let pos = 0;
  for (let i = 0; pos < audio.length; i += 1) {
    const size = pieceSizes[i % pieceSizes.length];
    parts.push(mel.push(audio.subarray(pos, Math.min(audio.length, pos + size))));
    pos += size;
  }
  parts.push(mel.finish());
  return concat(parts);
}

describe('slaneyMelFilterbank', () => {
  it('matches librosa.filters.mel(sr=16000, n_fft=512, n_mels=128, norm="slaney")', () => {
    const w = slaneyMelFilterbank();
    const peak = (row: number) => {
      let best = 0;
      for (let k = 1; k < 257; k += 1) if (w[row * 257 + k] > w[row * 257 + best]) best = k;
      return { bin: best, value: w[row * 257 + best] };
    };
    expect(peak(0)).toEqual({ bin: 1, value: expect.closeTo(0.02837754227221012, 7) });
    expect(peak(64)).toEqual({ bin: 55, value: expect.closeTo(0.018818283453583717, 7) });
    expect(peak(127)).toEqual({ bin: 250, value: expect.closeTo(0.005223188549280167, 7) });
  });
});

describe('MelFrontend', () => {
  it('matches the reference extractor', () => {
    const f = melAll(tones());
    expect(f.length / 128).toBe(50);
    const at = (frame: number, bin: number) => f[frame * 128 + bin];
    expect(at(0, 40)).toBeCloseTo(0.5883427858352661, 3);
    expect(at(25, 40)).toBeCloseTo(1.3887724876403809, 3);
    expect(at(25, 13)).toBeCloseTo(-3.7707808017730713, 3);
    expect(at(25, 100)).toBeCloseTo(-16.635467529296875, 3);
    expect(at(49, 5)).toBeCloseTo(-9.963785171508789, 3);
  });

  it('gives the same frames however the audio is split', () => {
    const audio = tones();
    const whole = melAll(audio);
    const pieces = melAll(audio, [800, 1, 333, 1601, 7]);
    expect(pieces.length).toBe(whole.length);
    let maxDiff = 0;
    for (let i = 0; i < whole.length; i += 1) maxDiff = Math.max(maxDiff, Math.abs(whole[i] - pieces[i]));
    expect(maxDiff).toBe(0);
  });

  it('emits a frame only once its window is complete, and floor(samples / 160) in total', () => {
    const mel = new MelFrontend();
    // Frame t reaches sample 160 t + 199.
    expect(mel.push(new Float32Array(199)).length).toBe(0);
    expect(mel.push(new Float32Array(1)).length).toBe(128);
    expect(mel.push(new Float32Array(160)).length).toBe(128);
    expect(mel.framesEmitted).toBe(2);
    // 1000 samples in all: floor(1000 / 160) = 6 frames.
    mel.push(new Float32Array(640));
    mel.finish();
    expect(mel.framesEmitted).toBe(6);
  });

  it('floors silence at log(2^-24)', () => {
    const f = melAll(new Float32Array(1600));
    for (const v of f) expect(v).toBeCloseTo(Math.log(2 ** -24), 5);
  });
});
