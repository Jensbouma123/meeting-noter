export interface Utterance {
  id: string;
  speaker: string;
  seconds: number;
  split: 'dev' | 'heldout';
  audio: Float32Array;
}
