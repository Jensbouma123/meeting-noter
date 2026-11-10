import { describe, expect, it } from 'vitest';
import {
  NEMOTRON,
  NEMOTRON_EMISSION_LEAD_S,
  NemotronMelStream,
  NemotronRecognizer,
  nemotronLangId,
  parseNemotronVocab,
  tokensToWords,
  type OrtLike,
  type OrtTensorLike,
  type SessionLike,
} from './nemotron-core';

/**
 * The Nemotron engine's model half without ONNX Runtime: the frontend's
 * framing, the greedy RNNT loop against scripted sessions, and the word
 * grouping speaker attribution reads.
 */

class FakeTensor implements OrtTensorLike {
  constructor(
    readonly type: string,
    readonly data: Float32Array | BigInt64Array,
    readonly dims: readonly number[],
  ) {}
}
const ort: OrtLike = { Tensor: FakeTensor as unknown as OrtLike['Tensor'] };

const { vocabSize, blankId, hidden, predHidden, chunkSamples } = NEMOTRON;

/** Vocabulary: blank last, `<en-US>` special, the rest SentencePiece pieces. */
function makeVocab(pieces: Record<number, string>): string[] {
  const vocab = Array.from({ length: vocabSize }, (_, i) => `p${i}`);
  vocab[0] = '<unk>';
  vocab[blankId] = '<blank>';
  for (const [id, piece] of Object.entries(pieces)) vocab[Number(id)] = piece;
  return vocab;
}

/**
 * Sessions that emit `script[globalFrame]` (in order) at that encoder frame.
 * The encoder tags each frame with its global index in element 0, so the
 * joint knows which frame it is looking at. The joint cannot see which of its
 * answers the loop keeps, so the test calls `markEmitted` from the decoder,
 * whose next input is exactly the token the loop committed.
 */
function scriptedSessions(script: Record<number, number[]>) {
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

describe('NemotronMelStream', () => {
  it('turns one 560 ms chunk into 56 frames of 128 mels', () => {
    const { mel, frames } = new NemotronMelStream().process(new Float32Array(chunkSamples));
    expect(frames).toBe(56);
    expect(mel.length).toBe(56 * 128);
    // Silence is the log guard, not NaN or -Infinity.
    expect(mel[0]).toBeCloseTo(Math.log(NEMOTRON.logEps), 5);
  });

  it('puts a 1 kHz tone in the mel bin that covers 1 kHz, in every chunk', () => {
    const stream = new NemotronMelStream();
    for (let c = 0; c < 2; c++) {
      const chunk = new Float32Array(chunkSamples);
      for (let i = 0; i < chunk.length; i++) chunk[i] = 0.5 * Math.sin((2 * Math.PI * 1000 * (c * chunkSamples + i)) / 16000);
      const { mel } = stream.process(chunk);
      const frame = mel.subarray(30 * 128, 31 * 128);
      const peak = frame.indexOf(Math.max(...frame));
      // Slaney: 1 kHz is mel 15 of ~45.2 at 8 kHz, so bin ≈ 15 / 45.2 * 129 - 1.
      expect(peak).toBeGreaterThanOrEqual(40);
      expect(peak).toBeLessThanOrEqual(44);
    }
  });
});

describe('tokensToWords', () => {
  const vocab = makeVocab({ 1: '<en-US>', 5: '▁Hel', 6: 'lo', 7: '▁world', 8: '.' });

  it('starts a word at every ▁ piece and times it by encoder frame', () => {
    const words = tokensToWords(
      [
        { id: 1, frame: 0, logProb: 0 },
        { id: 5, frame: 10, logProb: Math.log(0.5) },
        { id: 6, frame: 11, logProb: Math.log(1) },
        { id: 7, frame: 20, logProb: Math.log(0.9) },
        { id: 8, frame: 20, logProb: Math.log(0.9) },
      ],
      vocab,
    );
    expect(words.map((w) => w.text)).toEqual(['Hello', 'world.']);
    expect(words[0].start).toBeCloseTo(0.8);
    expect(words[0].end).toBeCloseTo(0.96);
    expect(words[0].confidence).toBeCloseTo(0.75);
    expect(words[1].start).toBeCloseTo(1.6);
    expect(words[1].end).toBeCloseTo(1.68);
  });

  it('shifts every time earlier by the lead, never below zero', () => {
    const words = tokensToWords([{ id: 7, frame: 2, logProb: 0 }], vocab, 0.5);
    expect(words[0].start).toBe(0);
    expect(words[0].end).toBeCloseTo(0);
  });
});

describe('NemotronRecognizer', () => {
  const vocab = makeVocab({ 5: '▁a', 6: '▁b', 7: 'c', 9: '<en-US>' });

  it('decodes greedily across chunks, advancing the prediction net only on emissions', async () => {
    const script = { 2: [5], 9: [6, 7] };
    const s = scriptedSessions(script);
    // Tie the joint's queue to what the loop committed: a committed token is
    // the next decoder input.
    const decoderRun = s.sessions.decoder.run;
    s.sessions.decoder.run = async (feeds) => {
      const token = Number((feeds.targets.data as BigInt64Array)[0]);
      if (token !== blankId) {
        const frame = Object.entries(script).find(([, q]) => q.includes(token))?.[0];
        if (frame !== undefined) s.markEmitted(Number(frame));
      }
      return decoderRun(feeds);
    };
    const rec = new NemotronRecognizer(ort, s.sessions, vocab);
    const result = await rec.recognize(new Float32Array(chunkSamples + 100), { flushChunks: 1, langId: 0 });

    expect(result.tokens.map((t) => [t.id, t.frame])).toEqual([
      [5, 2],
      [6, 9],
      [7, 9],
    ]);
    // Blank seeds the net; each emission is fed back exactly once.
    expect(s.decoderInputs).toEqual([blankId, 5, 6, 7]);
    expect(result.words.map((w) => w.text)).toEqual(['a', 'bc']);
    expect(result.text).toBe('a bc');
    // Emission lag corrected: frame 9 is 0.72 s, the word starts earlier.
    expect(result.words[1].start).toBeCloseTo(9 * NEMOTRON.frameSeconds - NEMOTRON_EMISSION_LEAD_S);
    // Two audio chunks plus one flush chunk; the cache length is carried.
    expect(s.cacheLens).toEqual([BigInt(0), BigInt(1), BigInt(2)]);
    expect(s.langIds).toEqual([BigInt(0), BigInt(0), BigInt(0)]);
  });

  it('caps emissions per frame at maxSymbolsPerStep', async () => {
    const s = scriptedSessions({});
    // A joint that never says blank on frame 0 and always says blank elsewhere.
    s.sessions.joint = {
      async run(feeds) {
        const enc = feeds.encoder_output.data as Float32Array;
        const span = feeds.encoder_output.dims[1];
        const logits = new Float32Array(span * vocabSize).fill(-10);
        for (let f = 0; f < span; f++) logits[f * vocabSize + (enc[f * hidden] === 0 ? 5 : blankId)] = 0;
        return { joint_output: new FakeTensor('float32', logits, [1, span, 1, vocabSize]) };
      },
    };
    const rec = new NemotronRecognizer(ort, s.sessions, vocab);
    const result = await rec.recognize(new Float32Array(100), { flushChunks: 0 });
    expect(result.tokens).toHaveLength(NEMOTRON.maxSymbolsPerStep);
    expect(result.tokens.every((t) => t.frame === 0)).toBe(true);
  });

  it('returns nothing for no audio without running a session', async () => {
    const s = scriptedSessions({});
    const rec = new NemotronRecognizer(ort, s.sessions, vocab);
    expect((await rec.recognize(new Float32Array(0))).words).toEqual([]);
    expect(s.cacheLens).toEqual([]);
  });
});

describe('vocab and language', () => {
  it('reads one piece per line, blank last', () => {
    expect(parseNemotronVocab('<unk>\n▁a\n<blank>\n')).toEqual(['<unk>', '▁a', '<blank>']);
  });

  it('maps languages to the prompt ids, auto for anything unlisted', () => {
    expect(nemotronLangId('en')).toBe(0);
    expect(nemotronLangId('nl')).toBe(16);
    expect(nemotronLangId('nl-BE')).toBe(16);
    expect(nemotronLangId('xx')).toBe(101);
    expect(nemotronLangId(undefined)).toBe(101);
  });
});
