import type { BleedParams } from './bleed-params';

export interface EvalCase {
  id: string;
  kind: 'echo' | 'crosstalk';
  split: 'dev' | 'heldout';
  systemUtt: string;
  micUtt: string | null;
  bleed: BleedParams | null;
  offsetSec: number;
}
