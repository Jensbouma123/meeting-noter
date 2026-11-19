export interface BleedOptions {
  delayMs: number;
  gain: number;
  noiseLevel: number;
  echoMs: number;
}

export interface Take {
  source: 'mic' | 'system';
  audio: Float32Array;
  text: string;
}
