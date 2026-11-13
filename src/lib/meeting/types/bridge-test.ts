export interface BridgeTestTurn {
  speaker: string;
  source: string;
  start: number;
  end: number;
}

export interface BridgeTestPush {
  source: string;
  chunk: Float32Array;
  startSample?: number;
}
