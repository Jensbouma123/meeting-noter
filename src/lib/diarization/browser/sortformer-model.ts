import { HIDDEN_SIZE, NUM_MEL_BINS, SUBSAMPLING_FACTOR } from './manifest';
import { createSession, Tensor, type InferenceSession } from './onnx-session';
import type { ExternalDataFile, SessionBackend, SortformerOutput, SortformerRunner } from './types';

export class SortformerModel implements SortformerRunner {
  private session: InferenceSession | null = null;
  backend: SessionBackend | null = null;

  async load(graph: string | Uint8Array, weights: ExternalDataFile): Promise<void> {
    const { session, backend } = await createSession(graph, [weights]);
    this.session = session;
    this.backend = backend;
  }

  async run(
    features: Float32Array,
    numMelFrames: number,
    cachedEmbeds: Float32Array,
    numCachedFrames: number,
  ): Promise<SortformerOutput> {
    if (!this.session) throw new Error('SortformerModel: not loaded');
    const numEmbedFrames = numCachedFrames + Math.ceil(numMelFrames / SUBSAMPLING_FACTOR);
    const outputs = await this.session.run({
      input_features: new Tensor('float32', features, [1, numMelFrames, NUM_MEL_BINS]),
      cached_embeds: new Tensor('float32', cachedEmbeds, [1, numCachedFrames, HIDDEN_SIZE]),
      attention_mask: new Tensor('int64', new BigInt64Array(numEmbedFrames).fill(BigInt(1)), [1, numEmbedFrames]),
    });
    return {
      logits: outputs.logits.data as Float32Array,
      chunkEmbeds: outputs.chunk_embeds.data as Float32Array,
      silenceEmbeds: outputs.silence_embeds.data as Float32Array,
    };
  }

  dispose(): void {
    void this.session?.release();
    this.session = null;
  }
}
