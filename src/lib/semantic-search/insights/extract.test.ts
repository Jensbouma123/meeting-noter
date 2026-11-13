import { describe, expect, it } from 'vitest';
import type { Segment } from '@/lib/meeting/types';
import type { Embedder } from '../types';
import { extractInsights } from './extract';
import { NEGATIVE_PROTOTYPES } from './negative-prototypes';
import { ACTION_PROTOTYPES, DECISION_PROTOTYPES } from './prototypes';

const DIM = 8;
const vec = (...xs: number[]) => Float32Array.from({ length: DIM }, (_, i) => xs[i] ?? 0);

function stubEmbedder(seen: string[] = []): Embedder {
  return {
    dim: DIM,
    async embed(texts) {
      seen.push(...texts);
      return texts.map((t) => {
        if (DECISION_PROTOTYPES.includes(t)) return vec(1);
        if (ACTION_PROTOTYPES.includes(t)) return vec(0, 1);
        if (NEGATIVE_PROTOTYPES.includes(t)) return vec(0, 0, 1);
        if (t.includes('besloten') || t.includes('decided')) return vec(1, 0, 0.3);
        if (t.includes('stuur')) return vec(0, 1, 0.3);
        if (t.includes('gaan zo meteen')) return vec(0, 0.8, 1);
        return vec(0.9, 0.9, 0.2);
      });
    },
  };
}

const seg = (id: string, start: number, text: string, speaker = 'mic:0'): Segment => ({ id, source: 'mic', speaker, text, start, end: start + 2, final: true });

describe('extractInsights', () => {
  it('keeps cued, complete NL/EN sentences that beat the negative prototypes', async () => {
    const out = await extractInsights([
      seg('1', 1, 'We hebben besloten om vrijdag te releasen.'),
      seg('2', 5, 'Ik stuur de offerte'),
      seg('3', 6, 'morgen naar de klant.'),
      seg('4', 9, 'We gaan zo meteen kijken of de speakers kloppen.'),
    ], stubEmbedder());
    expect(out.map((i) => [i.kind, i.segmentId, i.text])).toEqual([
      ['decision', '1', 'We hebben besloten om vrijdag te releasen.'],
      ['action', '2', 'Ik stuur de offerte morgen naar de klant.'],
    ]);
  });

  it('never embeds or returns the noise from meeting 8fdc9a6d', async () => {
    const seen: string[] = [];
    const out = await extractInsights([
      seg('a', 1, 'Und zwar können entsprechend.'),
      seg('b', 4, 'Dat is gewoon één.', 'mic:1'),
      seg('c', 7, 'Yes, I feel like'),
      seg('d', 12, 'I think we have a float look.', 'mic:1'),
      seg('e', 16, 'En dat is dus het fijne waarom dit zo snel gaat.'),
    ], stubEmbedder(seen));
    expect(out).toEqual([]);
    expect(seen).toEqual([]);
  });

  it('dedupes near-identical sentences keeping the earliest', async () => {
    const out = await extractInsights([
      seg('1', 1, 'We decided to ship the export on Friday.'),
      seg('2', 9, 'So we decided to ship the export on Friday.'),
    ], stubEmbedder());
    expect(out.map((i) => i.segmentId)).toEqual(['1']);
  });

  it('caps at 5 per kind', async () => {
    const segs = Array.from({ length: 9 }, (_, n) => seg(String(n), n * 10, `We hebben besloten om optie ${n} te kiezen.`));
    const out = await extractInsights(segs, {
      dim: 16,
      async embed(texts) {
        return texts.map((t) => {
          const v = new Float32Array(16);
          if (DECISION_PROTOTYPES.includes(t)) v[0] = 1;
          else if (ACTION_PROTOTYPES.includes(t)) v[1] = 1;
          else if (NEGATIVE_PROTOTYPES.includes(t)) v[2] = 1;
          else {
            v[0] = 1;
            v[3 + Number(t.match(/\d/)![0])] = 0.6;
          }
          return v;
        });
      },
    });
    expect(out.filter((i) => i.kind === 'decision')).toHaveLength(5);
  });

  it('returns nothing for an empty transcript', async () => {
    expect(await extractInsights([], stubEmbedder())).toEqual([]);
  });
});
