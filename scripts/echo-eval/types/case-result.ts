import type { BleedParams } from './bleed-params';

export interface SegmentView {
  source: 'mic' | 'system';
  text: string;
  start: number;
  end: number;
}

export interface CaseResult {
  id: string;
  kind: 'echo' | 'crosstalk';
  split: 'dev' | 'heldout';
  systemUtt: string;
  micUtt: string | null;
  bleed: BleedParams | null;
  micAsr: SegmentView[];
  systemAsr: SegmentView[];
  micSurvivors: SegmentView[];
  micDropped: SegmentView[];
}
