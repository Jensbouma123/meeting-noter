import type { EchoConfig } from '../types/echo-config';

export const DEFAULT_ECHO_CONFIG: EchoConfig = {
  marginFrames: 25,
  maxLagFrames: 45,
  kernelsMs: [0, 40, 120],
  noisePct: 0.1,
  gainPct: 0.5,
  gainBins: 8,
  logCorr: false,
  nearEndRatio: 4,
  minCorr: 0.7,
  maxNearEnd: 0.3,
  maxGainDb: 0,
};
