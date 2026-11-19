import type { EchoFeatures } from '@/lib/meeting/types/echo-features';
import type { EchoFrames } from '@/lib/meeting/types/echo-frames';
import type { CaseResult } from './case-result';

export interface MeasuredCase {
  result: CaseResult;
  mic: EchoFrames;
  system: EchoFrames;
  features: (EchoFeatures | null)[];
}
