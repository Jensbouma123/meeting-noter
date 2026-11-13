export interface DiarizationFeed {
  running: boolean;
  waiting: boolean;
  heardSeconds: number;
  turns: number;
}

export interface DownloadWaitState {
  stop: (() => void) | null;
  redownloadedThisSession: boolean;
}

export interface TurnEdge {
  at: number;
  speaker: string;
  delta: 1 | -1;
}

export interface OpenOverlap {
  start: number;
  speakers: Set<string>;
}
