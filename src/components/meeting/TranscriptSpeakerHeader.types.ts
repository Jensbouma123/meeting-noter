import type { ReactNode } from 'react';

export interface TranscriptSpeakerHeaderProps {
  dotClass: string;
  start: number;
  title?: string;
  children: ReactNode;
}
