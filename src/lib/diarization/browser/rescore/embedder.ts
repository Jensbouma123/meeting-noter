import type { SpeakerEmbedderLike } from '../types/rescore';
import { createSession, Tensor, type InferenceSession } from '../onnx-session';
import { FBANK_BINS } from './fbank';
import { lengthBatches } from './length-batches';
import { EMBEDDING_SIZE, RESCORE_PARAMS } from './params';

export class SpeakerEmbedder implements SpeakerEmbedderLike {
  private session: Promise<InferenceSession> | null = null;

  constructor(private readonly load: () => Promise<Uint8Array | string>) {}

  async embed(feats: Float32Array[], frames: number[]): Promise<Float32Array> {
    const out = new Float32Array(feats.length * EMBEDDING_SIZE);
    if (feats.length === 0) return out;
    const session = await this.open();
    const input = session.inputNames[0];
    const output = session.outputNames[0];
    for (const batch of lengthBatches(frames, RESCORE_PARAMS.batch)) {
      const t = frames[batch[0]];
      const data = new Float32Array(batch.length * t * FBANK_BINS);
      batch.forEach((index, row) => data.set(feats[index].subarray(0, t * FBANK_BINS), row * t * FBANK_BINS));
      const result = await session.run({ [input]: new Tensor('float32', data, [batch.length, t, FBANK_BINS]) });
      const emb = result[output].data as Float32Array;
      batch.forEach((index, row) =>
        out.set(emb.subarray(row * EMBEDDING_SIZE, (row + 1) * EMBEDDING_SIZE), index * EMBEDDING_SIZE),
      );
    }
    return out;
  }

  async dispose(): Promise<void> {
    const pending = this.session;
    this.session = null;
    if (!pending) return;
    const session = await pending.catch(() => null);
    await session?.release();
  }

  private open(): Promise<InferenceSession> {
    if (!this.session) {
      const pending = this.load().then(async (model) => (await createSession(model)).session);
      pending.catch(() => {
        if (this.session === pending) this.session = null;
      });
      this.session = pending;
    }
    return this.session;
  }
}
