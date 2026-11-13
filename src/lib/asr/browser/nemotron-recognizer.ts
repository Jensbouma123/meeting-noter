import {
  NEMOTRON,
  NEMOTRON_EMISSION_LEAD_S,
  NEMOTRON_LANG_IDS,
} from './nemotron-constants';
import { greedyDecodeChunk } from './nemotron-greedy-decode';
import { NemotronMelStream } from './nemotron-mel-stream';
import { NemotronPredictionState } from './nemotron-prediction-state';
import { isSpecialPiece, tokensToWords } from './nemotron-vocab';
import type {
  NemotronRecognizeOptions,
  NemotronResult,
  NemotronSessions,
  NemotronToken,
  OrtLike,
  OrtTensorLike,
} from './types';

export class NemotronRecognizer {
  private readonly ort: OrtLike;
  private readonly sessions: NemotronSessions;
  private readonly vocab: readonly string[];

  constructor(ort: OrtLike, sessions: NemotronSessions, vocab: readonly string[]) {
    this.ort = ort;
    this.sessions = sessions;
    this.vocab = vocab;
  }

  get pieces(): readonly string[] {
    return this.vocab;
  }

  async recognize(audio: Float32Array, options: NemotronRecognizeOptions = {}): Promise<NemotronResult> {
    const startedAt = Date.now();
    const langId = options.langId ?? NEMOTRON_LANG_IDS.en;
    const flushChunks = options.flushChunks ?? 1;
    const lead = options.leadSeconds ?? NEMOTRON_EMISSION_LEAD_S;
    const { chunkSamples, nMels, preEncodeCache, melFramesPerChunk, layers, hidden, leftContext, convContext } =
      NEMOTRON;

    const tokens: NemotronToken[] = [];
    let firstTokenMs: number | null = null;
    if (audio.length === 0) return { text: '', words: [], tokens, firstTokenMs };

    const { Tensor } = this.ort;
    const mel = new NemotronMelStream();
    const melCache = new Float32Array(preEncodeCache * nMels);
    let cacheChannel: OrtTensorLike = new Tensor(
      'float32',
      new Float32Array(layers * leftContext * hidden),
      [1, layers, leftContext, hidden],
    );
    let cacheTime: OrtTensorLike = new Tensor(
      'float32',
      new Float32Array(layers * hidden * convContext),
      [1, layers, hidden, convContext],
    );
    let cacheLen: OrtTensorLike = new Tensor('int64', new BigInt64Array(1), [1]);
    const lang = new Tensor('int64', BigInt64Array.from([BigInt(langId)]), [1]);
    const length = new Tensor('int64', BigInt64Array.from([BigInt(preEncodeCache + melFramesPerChunk)]), [1]);
    const decoder = new NemotronPredictionState(this.ort, this.sessions.decoder);
    const biaser = options.biaser ?? null;
    biaser?.reset();

    const audioChunks = Math.ceil(audio.length / chunkSamples);
    const total = audioChunks + flushChunks;
    const signal = new Float32Array((preEncodeCache + melFramesPerChunk) * nMels);
    let frameBase = 0;

    for (let c = 0; c < total; c++) {
      const chunk = new Float32Array(chunkSamples);
      if (c < audioChunks) chunk.set(audio.subarray(c * chunkSamples, Math.min(audio.length, (c + 1) * chunkSamples)));
      const { mel: frames, frames: count } = mel.computeLogMel(chunk);
      if (count !== melFramesPerChunk) throw new Error(`Nemotron frontend produced ${count} frames, expected ${melFramesPerChunk}`);
      signal.set(melCache, 0);
      signal.set(frames, melCache.length);
      melCache.set(frames.subarray((count - preEncodeCache) * nMels));

      const out = await this.sessions.encoder.run({
        audio_signal: new Tensor('float32', signal, [1, preEncodeCache + count, nMels]),
        length,
        cache_last_channel: cacheChannel,
        cache_last_time: cacheTime,
        cache_last_channel_len: cacheLen,
        lang_id: lang,
      });
      cacheChannel.dispose?.();
      cacheTime.dispose?.();
      cacheChannel = out.cache_last_channel_next;
      cacheTime = out.cache_last_time_next;
      cacheLen = out.cache_last_channel_len_next;
      const enc = out.outputs;
      const encLen = Math.min(enc.dims[1], Number((out.encoded_lengths.data as BigInt64Array)[0]));
      const emitted = await greedyDecodeChunk(
        this.ort,
        this.sessions.joint,
        decoder,
        enc.data as Float32Array,
        encLen,
        frameBase,
        biaser,
      );
      enc.dispose?.();
      for (const tok of emitted) {
        if (firstTokenMs === null && !isSpecialPiece(this.vocab[tok.id] ?? '<>')) firstTokenMs = Date.now() - startedAt;
        tokens.push(tok);
      }
      frameBase += encLen;
      options.onChunk?.(c, total);
    }
    cacheChannel.dispose?.();
    cacheTime.dispose?.();
    decoder.dispose();

    const words = tokensToWords(tokens, this.vocab, lead);
    return { text: words.map((w) => w.text).join(' '), words, tokens, firstTokenMs };
  }
}
