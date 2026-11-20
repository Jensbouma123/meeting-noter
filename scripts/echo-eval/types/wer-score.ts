export interface WerScore {
  refWords: number;
  hypWords: number;
  edits: number;
  wer: number;
}

export interface SpeakerWerScore extends WerScore {
  speaker: string;
  labels: string[];
}
