import { classifyEcho } from '@/lib/meeting/echo/echo-classify';
import type { EchoConfig } from '@/lib/meeting/types/echo-config';
import type { EchoFeatures } from '@/lib/meeting/types/echo-features';
import type { FeatureSummary } from '../types/feature-summary';

const QS = [0.02, 0.1, 0.5, 0.9, 0.98];

const quantiles = (xs: number[]): number[] => {
  const s = [...xs].sort((a, b) => a - b);
  return QS.map((q) => +(s[Math.min(s.length - 1, Math.floor(q * s.length))] ?? NaN).toFixed(3));
};

export function summarize(features: (EchoFeatures | null)[], cfg: EchoConfig): FeatureSummary {
  const fs = features.filter((f): f is EchoFeatures => f !== null);
  const share = (p: (f: EchoFeatures) => boolean) => +(fs.filter(p).length / Math.max(1, fs.length)).toFixed(3);
  return {
    n: fs.length,
    echo: share((f) => classifyEcho(f, cfg) === 'echo'),
    passCorr: share((f) => f.corr >= cfg.minCorr),
    passNearEnd: share((f) => f.nearEnd <= cfg.maxNearEnd),
    passGain: share((f) => f.gainDb <= cfg.maxGainDb),
    corr: quantiles(fs.map((f) => f.corr)),
    nearEnd: quantiles(fs.map((f) => f.nearEnd)),
    gainDb: quantiles(fs.map((f) => f.gainDb)),
  };
}
