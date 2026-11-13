import { describe, expect, it } from 'vitest';
import type { Segment } from '@/lib/meeting/types';
import type { Embedder } from '../types';
import { extractInsights } from './extract';
import { ACTION_PROTOTYPES, DECISION_PROTOTYPES } from './prototypes';

const DIM = 8;
function axis(i: number, tilt = 0): Float32Array {
  const v = new Float32Array(DIM);
  v[i] = 1;
  v[(i + 1) % DIM] = tilt;
  return v;
}

function stubEmbedder(): Embedder {
  return {
    dim: DIM,
    async embed(texts) {
      return texts.map((t) => {
        if (DECISION_PROTOTYPES.includes(t)) return axis(0);
        if (ACTION_PROTOTYPES.includes(t)) return axis(1);
        if (t.startsWith('DECIDE')) return axis(0, t.includes('B') ? 0.5 : 0.05);
        if (t.startsWith('ACT')) return axis(1, 0.05);
        if (t.startsWith('MIX')) return new Float32Array([0.7, 0.69, 0, 0, 0, 0, 0, 0]);
        if (t.startsWith('WEAK')) return axis(5);
        return axis(6);
      });
    },
  };
}

const seg = (id: string, start: number, text: string): Segment => ({ id, source: 'mic', speaker: 'mic:0', text, start, end: start + 2, final: true });

describe('extractInsights', () => {
  it('labels decisions and actions, skips short, weak and low-margin sentences', async () => {
    const out = await extractInsights([
      seg('1', 1, 'DECIDE we ship friday'),
      seg('2', 2, 'ACT ik stuur het door'),
      seg('3', 3, 'WEAK just chatting along'),
      seg('4', 4, 'MIX which is it really'),
      seg('5', 5, 'DECIDE no'),
    ], stubEmbedder());
    expect(out.map((i) => [i.kind, i.segmentId])).toEqual([['decision', '1'], ['action', '2']]);
    expect(out[0].score).toBeGreaterThanOrEqual(0.55);
  });

  it('dedupes near-identical sentences keeping the earliest', async () => {
    const out = await extractInsights([seg('1', 1, 'DECIDE first version here'), seg('2', 9, 'DECIDE second version here')], stubEmbedder());
    expect(out.map((i) => i.segmentId)).toEqual(['1']);
  });

  it('caps at 8 per kind', async () => {
    const segs = Array.from({ length: 12 }, (_, n) => seg(String(n), n, `DECIDE${'B'.repeat(n % 2)} option number ${n}`));
    const out = await extractInsights(segs, {
      dim: 16,
      async embed(texts) {
        return texts.map((t) => {
          const v = new Float32Array(16);
          if (DECISION_PROTOTYPES.includes(t)) v[0] = 1;
          else if (ACTION_PROTOTYPES.includes(t)) v[1] = 1;
          else {
            v[0] = 1;
            v[2 + Number(t.split(' ').pop())] = 0.4 + Number(t.split(' ').pop()) * 0.01;
          }
          return v;
        });
      },
    });
    expect(out.filter((i) => i.kind === 'decision')).toHaveLength(8);
  });

  it('returns nothing for an empty transcript', async () => {
    expect(await extractInsights([], stubEmbedder())).toEqual([]);
  });
});
