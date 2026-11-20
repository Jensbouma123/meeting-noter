import type { Segment, Speaker } from '@/lib/meeting';
import type { SpeakerStyle } from './LiveTranscript.types';

export interface OverlapColumnProps {
  speakerId: string;
  segs: Segment[];
  sessionId?: string;
  speakers: Record<string, Speaker>;
  style: SpeakerStyle;
}
