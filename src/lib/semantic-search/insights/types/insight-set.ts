import type { Insight } from './insight';

export interface InsightSet {
  items: Insight[];
  dismissed: string[];
}
