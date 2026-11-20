import type { Segment } from '@/lib/meeting';
import type { SpeakerStyle } from './LiveTranscript.types';

export interface OverlapColumnProps {
  speakerId: string;
  segs: Segment[];
  sessionId?: string;
  style: SpeakerStyle;
}
