import { describe, expect, it } from 'vitest';
import { NEMOTRON, NEMOTRON_EMISSION_LEAD_S } from './nemotron-constants';
import { NemotronRecognizer } from './nemotron-recognizer';
import {
  blankId,
  chunkSamples,
  FakeTensor,
  hidden,
  makeVocab,
  ort,
  scriptedSessions,
  vocabSize,
} from './nemotron-test-fakes';

describe('NemotronRecognizer', () => {
  const vocab = makeVocab({ 5: '▁a', 6: '▁b', 7: 'c', 9: '<en-US>' });

  it('decodes greedily across chunks, advancing the prediction net only on emissions', async () => {
    const script = { 2: [5], 9: [6, 7] };
    const s = scriptedSessions(script);

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

    expect(s.decoderInputs).toEqual([blankId, 5, 6, 7]);
    expect(result.words.map((w) => w.text)).toEqual(['a', 'bc']);
    expect(result.text).toBe('a bc');

    expect(result.words[1].start).toBeCloseTo(9 * NEMOTRON.frameSeconds - NEMOTRON_EMISSION_LEAD_S);

    expect(s.cacheLens).toEqual([BigInt(0), BigInt(1), BigInt(2)]);
    expect(s.langIds).toEqual([BigInt(0), BigInt(0), BigInt(0)]);
  });

  it('caps emissions per frame at maxSymbolsPerStep', async () => {
    const s = scriptedSessions({});

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
