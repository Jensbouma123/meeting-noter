import type { Segment } from './segment';

export type ExportFormat = 'markdown' | 'txt' | 'srt';

export interface FormatMeta {
  value: ExportFormat;
  label: string;
  extension: string;
  mime: string;
}

export interface ExportOptions {
  callAudioMissing?: boolean;
  startedAt?: number | null;
}

export type TranscriptBlock<T extends Segment> =
  | { kind: 'turn'; segments: T[] }
  | {
      kind: 'overlap';
      start: number;
      end: number;
      source: T['source'];
      speakers: string[];
      segments: T[];
    };

export interface TurnLine {
  start: number;
  end: number;
  text: string;
  label?: string;
}

export interface Turn {
  speaker: string;
  label: string;
  start: number;
  end: number;
  lines: TurnLine[];
  overlap?: { labels: string[] };
}

export interface OverlapColumn {
  words: number;
  seconds: number;
}
