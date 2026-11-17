import type { Segment, Speaker } from '@/lib/meeting';
import type { SpeakerStyle } from './LiveTranscript.types';

export interface OverlapColumnProps {
  speakerId: string;
  segs: Segment[];
  speakers: Record<string, Speaker>;
  sessionId?: string;
  style: SpeakerStyle;
}
