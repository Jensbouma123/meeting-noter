import type { EchoConfig } from '@/lib/meeting/types/echo-config';
import type { TuneScore } from './tune-score';

export interface TuneTrial {
  cfg: EchoConfig;
  score: TuneScore;
  cost: number;
}
