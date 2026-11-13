import type { Segment } from '@/lib/meeting';

export interface TranscriptTurnHeaderProps {
  segment: Segment;
  speakerLabel: string;
  speakerColorIndex: number;
}
