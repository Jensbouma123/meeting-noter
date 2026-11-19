export interface EchoConfig {
  marginFrames: number;
  maxLagFrames: number;
  kernelsMs: readonly number[];
  noisePct: number;
  gainPct: number;
  nearEndRatio: number;
  minCorr: number;
  maxNearEnd: number;
  maxGainDb: number;
}
