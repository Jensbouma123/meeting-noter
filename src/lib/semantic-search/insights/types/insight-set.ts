import type { Insight } from './insight';

export interface InsightSet {
  version: number;
  items: Insight[];
  dismissed: string[];
}
