export interface PostedMessage {
  type: string;
  id: string;
  message?: string;
  code?: string;
  backend?: string;
  speakerState?: unknown;
}

export interface FakeCoreRecord {
  options: {
    mode: { chunkLength: number };
    turns?: { provisional?: boolean };
    speakerState?: { numFrames: number; embeds: Float32Array } | null;
  };
  pushed: Array<number | undefined>;
}

export interface CoreSnapshotStub {
  numFrames: number;
  compressed: boolean;
  embeds: Float32Array;
  probs: Float32Array;
}
