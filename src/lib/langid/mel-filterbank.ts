function hzToMel(hz: number): number {
  const fSp = 200 / 3;
  const minLogHz = 1000;
  const minLogMel = minLogHz / fSp;
  const logstep = Math.log(6.4) / 27;
  if (hz < minLogHz) return hz / fSp;
  return minLogMel + Math.log(hz / minLogHz) / logstep;
}

function melToHz(mel: number): number {
  const fSp = 200 / 3;
  const minLogHz = 1000;
  const minLogMel = minLogHz / fSp;
  const logstep = Math.log(6.4) / 27;
  if (mel < minLogMel) return fSp * mel;
  return minLogHz * Math.exp(logstep * (mel - minLogMel));
}

export function buildMelFilterbank(sampleRate: number, nFft: number, nMels: number, nFreqBins: number): Float64Array {
  const fMin = 0;
  const fMax = sampleRate / 2;
  const melMin = hzToMel(fMin);
  const melMax = hzToMel(fMax);

  const melPoints = new Float64Array(nMels + 2);
  for (let i = 0; i < nMels + 2; i++) {
    melPoints[i] = melMin + ((melMax - melMin) * i) / (nMels + 1);
  }
  const hzPoints = Float64Array.from(melPoints, melToHz);
  const fftFreqs = new Float64Array(nFreqBins);
  for (let i = 0; i < nFreqBins; i++) fftFreqs[i] = (i * sampleRate) / nFft;

  const filters = new Float64Array(nMels * nFreqBins);
  for (let m = 0; m < nMels; m++) {
    const left = hzPoints[m];
    const center = hzPoints[m + 1];
    const right = hzPoints[m + 2];
    const enorm = 2 / (right - left);
    for (let k = 0; k < nFreqBins; k++) {
      const f = fftFreqs[k];
      const upSlope = (f - left) / (center - left);
      const downSlope = (right - f) / (right - center);
      const weight = Math.max(0, Math.min(upSlope, downSlope));
      filters[m * nFreqBins + k] = weight * enorm;
    }
  }
  return filters;
}
