export interface TimedWord {
  text: string;
  start: number;
  end: number;
}

export interface AttributedWord extends TimedWord {
  speaker: string;
}

export interface OverlapTurn {
  speaker: string;
  start: number;
  end: number;
}

export interface OverlapSpan {
  start: number;
  end: number;
  speakers: string[];
}

export interface HeldChunk {
  at: number;
  samples: Float32Array;
}

export type TranscribeClip = (audio: Float32Array) => Promise<TimedWord[]>;

export type AudioAt = (start: number, end: number) => { audio: Float32Array; start: number } | null;
