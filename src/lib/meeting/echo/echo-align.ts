import type { EchoAlignment } from '../types/echo-alignment';
import type { EchoWindow } from '../types/echo-window';
import { amplitude, decay, logLevel, pearson, stdev } from './envelope-math';

const FRAME_MS = 10;
const SYSTEM_FLOOR = 1e-3;

const peak = (x: Float64Array): number => x.reduce((m, v) => Math.max(m, v), 0);

export function alignEcho(win: EchoWindow, kernelsMs: readonly number[], micNoise: number[] | null = null): EchoAlignment {
  const micAmp = win.mic.map(amplitude);
  const micEnv = micNoise ? win.mic.map((x, b) => logLevel(x, micNoise[b])) : micAmp;
  const sysEnv = (x: Float64Array) => (micNoise ? logLevel(x, SYSTEM_FLOOR * peak(x)) : amplitude(x));
  const weights = micAmp.map(stdev);
  const weightSum = weights.reduce((s, w) => s + w, 0);
  let best: EchoAlignment = { corr: 0, lag: 0, kernelMs: 0, delayed: win.system.map((x) => x.subarray(win.lagFrames)) };
  if (weightSum <= 0) return best;
  for (const kernelMs of kernelsMs) {
    const decayed = win.system.map((x) => decay(x, kernelMs, FRAME_MS));
    const sysAmp = decayed.map(sysEnv);
    for (let lag = 0; lag <= win.lagFrames; lag += 1) {
      let corr = 0;
      for (let b = 0; b < micEnv.length; b += 1) {
        if (weights[b] > 0) corr += weights[b] * pearson(sysAmp[b], win.lagFrames - lag, micEnv[b], win.frames);
      }
      corr /= weightSum;
      if (corr > best.corr) {
        const at = win.lagFrames - lag;
        best = { corr, lag, kernelMs, delayed: decayed.map((x) => x.subarray(at, at + win.frames)) };
      }
    }
  }
  return best;
}
