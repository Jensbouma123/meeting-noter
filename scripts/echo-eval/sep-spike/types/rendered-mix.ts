import type { MixSpec } from './mix-spec';

export interface RenderedMix {
  spec: MixSpec;
  mix: Float32Array;
  loudRef: Float32Array;
  quietRef: Float32Array;
  loudDry: Float32Array;
  quietDry: Float32Array;
}
