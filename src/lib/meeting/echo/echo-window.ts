import type { EchoFrames } from '../types/echo-frames';
import type { EchoWindow } from '../types/echo-window';
import { band } from './envelope-math';

const MIN_FRAMES = 10;

function padded(frames: EchoFrames, b: number, from: number, to: number): Float64Array {
  const out = new Float64Array(to - from);
  const lo = Math.max(from, frames.firstFrame);
  const hi = Math.min(to, frames.firstFrame + frames.frames);
  if (hi > lo) out.set(band(frames, b, lo - frames.firstFrame, hi - frames.firstFrame), lo - from);
  return out;
}

function total(frames: EchoFrames): Float64Array {
  const out = new Float64Array(frames.frames);
  for (let t = 0; t < frames.frames; t += 1) {
    for (let b = 0; b < frames.bands; b += 1) out[t] += frames.power[t * frames.bands + b];
  }
  return out;
}

export function echoWindow(
  mic: EchoFrames,
  system: EchoFrames,
  from: number,
  to: number,
  lagFrames: number,
): EchoWindow | null {
  const lo = Math.max(from, mic.firstFrame);
  const hi = Math.min(to, mic.firstFrame + mic.frames, system.firstFrame + system.frames);
  if (hi - lo < MIN_FRAMES) return null;
  const bands = Array.from({ length: mic.bands }, (_, b) => b);
  return {
    frames: hi - lo,
    lagFrames,
    mic: bands.map((b) => band(mic, b, lo - mic.firstFrame, hi - mic.firstFrame)),
    micHistory: bands.map((b) => band(mic, b, 0, hi - mic.firstFrame)),
    system: bands.map((b) => padded(system, b, lo - lagFrames, hi)),
    systemHistory: total(system),
  };
}
