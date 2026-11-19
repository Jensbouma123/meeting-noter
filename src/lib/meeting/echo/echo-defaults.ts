import type { EchoConfig } from '../types/echo-config';

export const DEFAULT_ECHO_CONFIG: EchoConfig = {
  marginFrames: 25,
  maxLagFrames: 45,
  kernelsMs: [0, 40, 120],
  noisePct: 0.1,
  gainPct: 0.3,
  nearEndRatio: 4,
  minCorr: 0.6,
  maxNearEnd: 0.2,
  maxGainDb: -3,
  speechCorr: 0.3,
  speechNearEnd: 0.5,
};
