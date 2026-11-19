import type { EchoConfig } from '../types/echo-config';
import type { EchoFeatures } from '../types/echo-features';
import type { EchoVerdict } from '../types/echo-verdict';

export function classifyEcho(f: EchoFeatures | null, cfg: EchoConfig): EchoVerdict | undefined {
  if (!f) return undefined;
  if (!f.systemActive) return 'speech';
  if (f.corr >= cfg.minCorr && f.nearEnd <= cfg.maxNearEnd && f.gainDb <= cfg.maxGainDb) return 'echo';
  if (f.corr < cfg.speechCorr || f.nearEnd >= cfg.speechNearEnd) return 'speech';
  return undefined;
}
