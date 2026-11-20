export interface TruthTurn {
  speaker: string;
  start: number;
  end: number;
}

export interface TwoSpeakerClip {
  pcm: Float32Array;
  truth: TruthTurn[];
}
