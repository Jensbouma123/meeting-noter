import { NEMOTRON } from './nemotron-constants';
import type { OrtLike, OrtTensorLike, SessionLike } from './types';

export class FakeTensor implements OrtTensorLike {
  constructor(
    readonly type: string,
    readonly data: Float32Array | BigInt64Array,
    readonly dims: readonly number[],
  ) {}
}
export const ort: OrtLike = { Tensor: FakeTensor as unknown as OrtLike['Tensor'] };

export const { vocabSize, blankId, hidden, predHidden, chunkSamples } = NEMOTRON;

export function makeVocab(pieces: Record<number, string>): string[] {
  const vocab = Array.from({ length: vocabSize }, (_, i) => `p${i}`);
  vocab[0] = '<unk>';
  vocab[blankId] = '<blank>';
  for (const [id, piece] of Object.entries(pieces)) vocab[Number(id)] = piece;
  return vocab;
}

export function scriptedSessions(script: Record<number, number[]>) {
  let chunk = 0;
  const decoderInputs: number[] = [];
  const cacheLens: bigint[] = [];
  const langIds: bigint[] = [];
  const emittedAt: Record<number, number> = {};
  const encoder: SessionLike = {
    async run(feeds) {
      cacheLens.push((feeds.cache_last_channel_len.data as BigInt64Array)[0]);
      langIds.push((feeds.lang_id.data as BigInt64Array)[0]);
      const out = new Float32Array(7 * hidden);
      for (let f = 0; f < 7; f++) out[f * hidden] = chunk * 7 + f;
      chunk += 1;
      return {
        outputs: new FakeTensor('float32', out, [1, 7, hidden]),
        encoded_lengths: new FakeTensor('int64', BigInt64Array.from([BigInt(7)]), [1]),
        cache_last_channel_next: feeds.cache_last_channel,
        cache_last_time_next: feeds.cache_last_time,
        cache_last_channel_len_next: new FakeTensor('int64', BigInt64Array.from([BigInt(chunk)]), [1]),
      };
    },
  };
  const decoder: SessionLike = {
    async run(feeds) {
      const token = Number((feeds.targets.data as BigInt64Array)[0]);
      decoderInputs.push(token);
      const out = new Float32Array(predHidden);
      out[0] = token;
      return {
        decoder_output: new FakeTensor('float32', out, [1, predHidden, 1]),
        h_out: new FakeTensor('float32', new Float32Array(2 * predHidden), [2, 1, predHidden]),
        c_out: new FakeTensor('float32', new Float32Array(2 * predHidden), [2, 1, predHidden]),
      };
    },
  };
  const joint: SessionLike = {
    async run(feeds) {
      const enc = feeds.encoder_output.data as Float32Array;
      const span = feeds.encoder_output.dims[1];
      const logits = new Float32Array(span * vocabSize).fill(-10);
      for (let f = 0; f < span; f++) {
        const frame = enc[f * hidden];
        const queue = script[frame] ?? [];
        const done = emittedAt[frame] ?? 0;
        const next = queue[done];
        logits[f * vocabSize + (next ?? blankId)] = -0.1;
      }
      return { joint_output: new FakeTensor('float32', logits, [1, span, 1, vocabSize]) };
    },
  };
  return {
    sessions: { encoder, decoder, joint },
    decoderInputs,
    cacheLens,
    langIds,
    markEmitted(frame: number) {
      emittedAt[frame] = (emittedAt[frame] ?? 0) + 1;
    },
  };
}
