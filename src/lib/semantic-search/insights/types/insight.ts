import type { InsightKind } from './insight-kind';

export interface Insight {
  id: string;
  kind: InsightKind;
  text: string;
  segmentId: string;
  speakerId: string;
  start: number;
  score: number;
}
