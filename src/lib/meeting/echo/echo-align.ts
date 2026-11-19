import type { EchoAlignment } from '../types/echo-alignment';
import type { EchoWindow } from '../types/echo-window';
import { amplitude, decay, pearson, stdev } from './envelope-math';

const FRAME_MS = 10;

export function alignEcho(win: EchoWindow, kernelsMs: readonly number[]): EchoAlignment {
  const micAmp = win.mic.map(amplitude);
  const weights = micAmp.map(stdev);
  const weightSum = weights.reduce((s, w) => s + w, 0);
  let best: EchoAlignment = { corr: 0, lag: 0, kernelMs: 0, delayed: win.system.map((x) => x.subarray(win.lagFrames)) };
  if (weightSum <= 0) return best;
  for (const kernelMs of kernelsMs) {
    const decayed = win.system.map((x) => decay(x, kernelMs, FRAME_MS));
    const sysAmp = decayed.map(amplitude);
    for (let lag = 0; lag <= win.lagFrames; lag += 1) {
      let corr = 0;
      for (let b = 0; b < micAmp.length; b += 1) {
        if (weights[b] > 0) corr += weights[b] * pearson(sysAmp[b], win.lagFrames - lag, micAmp[b], win.frames);
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
