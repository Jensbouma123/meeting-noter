import type { MixSpec } from './mix-spec';

export interface SpeakerScore {
  refWords: number;
  siSdrMix: number;
  siSdrSep: number;
  hitMix: number;
  hitSep: number;
  editSep: number;
}

export interface MixResult {
  spec: MixSpec;
  seconds: number;
  sepMs: number;
  loud: SpeakerScore;
  quiet: SpeakerScore;
  text: { loudRef: string; quietRef: string; mix: string; loudSep: string; quietSep: string };
}
