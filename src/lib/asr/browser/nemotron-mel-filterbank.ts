import { NEMOTRON } from './nemotron-constants';

export function slaneyFilterbank(): { start: Int32Array; weights: Float32Array[] } {
  const { nMels, nFft, sampleRate } = NEMOTRON;
  const bins = nFft / 2 + 1;
  const minLogHz = 1000;
  const minLogMel = 15;
  const linScale = 200 / 3;
  const logStep = Math.log(6.4) / 27;
  const hzToMel = (hz: number) => (hz < minLogHz ? hz / linScale : minLogMel + Math.log(hz / minLogHz) / logStep);
  const melToHz = (mel: number) => (mel < minLogMel ? mel * linScale : minLogHz * Math.exp((mel - minLogMel) * logStep));
  const lo = hzToMel(0);
  const hi = hzToMel(sampleRate / 2);
  const f = Array.from({ length: nMels + 2 }, (_, i) => melToHz(lo + ((hi - lo) * i) / (nMels + 1)));
  const start = new Int32Array(nMels);
  const weights: Float32Array[] = [];
  for (let m = 0; m < nMels; m++) {
    const row = new Float32Array(bins);
    const enorm = 2 / (f[m + 2] - f[m] + 1e-10);
    for (let k = 0; k < bins; k++) {
      const hz = (k * sampleRate) / nFft;
      const lower = (hz - f[m]) / (f[m + 1] - f[m] + 1e-10);
      const upper = (f[m + 2] - hz) / (f[m + 2] - f[m + 1] + 1e-10);
      row[k] = Math.max(0, Math.min(lower, upper)) * enorm;
    }
    let a = 0;
    while (a < bins - 1 && row[a] === 0) a++;
    let b = bins;
    while (b > a + 1 && row[b - 1] === 0) b--;
    start[m] = a;
    weights.push(row.slice(a, b));
  }
  return { start, weights };
}
