import type { Segment, Speaker } from '@/lib/meeting';
import type { SpeakerStyle } from './LiveTranscript.types';

export interface TranscriptSpeakerNameProps {
  sessionId?: string;
  speakerId: string;
  source: Segment['source'];
  speakers: Record<string, Speaker>;
  style: SpeakerStyle;
}
