export interface FeatureSummary {
  n: number;
  echo: number;
  passCorr: number;
  passNearEnd: number;
  passGain: number;
  corr: number[];
  nearEnd: number[];
  gainDb: number[];
}
