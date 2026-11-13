export interface LiveAsrFeed {
  frames: number;
  droppedNotReady: number;
  speechFrames: number;
  noiseFloor: number;
  windows: number;
  words: number;
  segments: number;
}

export type LiveFeedCounts = Omit<LiveAsrFeed, 'speechFrames' | 'noiseFloor'>;
