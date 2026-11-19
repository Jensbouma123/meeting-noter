import { noise, voice } from '@/lib/asr/test-signals';
import type { TimedTestWord } from './types/asr-test';
import type { BleedOptions } from './types/two-source-bleed';

const SR = 16_000;
const FRAME = 1600;

export const REALISTIC_BLEED: BleedOptions = { delayMs: 150, gain: 0.45, noiseLevel: 0.01, echoMs: 90 };

export function utterance(seconds: number, level = 0.3, seed = 0): Float32Array {
  const out = voice(Math.round(seconds * SR), level, seed * 777);
  return out;
}

export function bleedCopy(source: Float32Array, opts: BleedOptions): Float32Array {
  const delay = Math.round((opts.delayMs / 1000) * SR);
  const echo = Math.round((opts.echoMs / 1000) * SR);
  const hiss = noise(source.length + delay + echo, opts.noiseLevel, 9);
  const out = Float32Array.from(hiss);
  for (let i = 0; i < source.length; i += 1) {
    out[i + delay] += source[i] * opts.gain;
    out[i + delay + echo] += source[i] * opts.gain * 0.25;
  }
  return out;
}

export function padded(audio: Float32Array, leadSeconds: number, tailSeconds = 1): Float32Array {
  const out = new Float32Array(Math.round((leadSeconds + tailSeconds) * SR) + audio.length);
  out.set(audio, Math.round(leadSeconds * SR));
  return out;
}

export function toFrames(audio: Float32Array): ArrayBuffer[] {
  const frames: ArrayBuffer[] = [];
  for (let at = 0; at < audio.length; at += FRAME) {
    const frame = new Int16Array(FRAME);
    for (let i = 0; i < FRAME && at + i < audio.length; i += 1) {
      frame[i] = Math.round(Math.max(-1, Math.min(1, audio[at + i])) * 32767);
    }
    frames.push(frame.buffer);
  }
  return frames;
}

export function spoken(text: string, seconds: number): (s: number) => TimedTestWord[] {
  const words = text.split(' ');
  const step = (seconds - 0.1) / words.length;
  return (heard) =>
    words
      .map((w, i) => ({ text: w, start: 0.05 + i * step, end: 0.05 + (i + 1) * step - 0.02 }))
      .filter((w) => w.end <= heard);
}
