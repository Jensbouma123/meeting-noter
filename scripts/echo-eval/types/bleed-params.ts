export interface BleedParams {
  delayMs: number;
  gainDb: number;
  noiseDbfs: number;
  rt60: number;
  hpHz: number;
  lpHz: number;
  clipDrive?: number;
  compressThresholdDb?: number;
  compressRatio?: number;
  driftPpm?: number;
  aecDb?: number;
  aecDuckDb?: number;
}
