import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { SpeakerTurn } from '@/lib/diarization/browser/types';
import { CORPUS_DIR } from './out-dir';
import { diarizeClip } from './lib/diar-host';
import { loadSortformer } from './lib/diar-model-loader';
import { diarModelReady } from './lib/diar-paths';
import { buildTwoSpeakerClip } from './lib/two-speaker-clip';
import type { TruthTurn } from './types/two-speaker-clip';

vi.mock('@/lib/ort-paths', async () => (await import('./lib/diar-ort-mock')).nodeOrtPaths());

const enabled = process.env.ECHO_EVAL_SET === 'diar-host' && diarModelReady();
const overlap = (a: TruthTurn, b: SpeakerTurn) => Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
const majoritySlot = (t: TruthTurn, turns: SpeakerTurn[]) => {
  const bySlot = new Map<string, number>();
  for (const s of turns) bySlot.set(s.speaker, (bySlot.get(s.speaker) ?? 0) + overlap(t, s));
  return [...bySlot].sort((x, y) => y[1] - x[1])[0]?.[0];
};

describe.skipIf(!enabled)('diarizer host', () => {
  it('gives two speakers two distinct slots', async () => {
    const clip = buildTwoSpeakerClip(path.join(CORPUS_DIR, 'en-1089-134686-0014.wav'), path.join(CORPUS_DIR, 'en-1221-135767-0024.wav'));
    const model = await loadSortformer();
    const res = await diarizeClip(clip.pcm, { model });
    model.dispose();
    const mapped = clip.truth.map((t) => ({ truth: t.speaker, slot: majoritySlot(t, res.finalTurns) }));
    console.log(JSON.stringify({ slots: res.slots, rtf: res.rtf.toFixed(2), mapped, turns: res.finalTurns }));
    expect(res.slots).toHaveLength(2);
    const slotOf = new Map(mapped.map((m) => [m.truth, m.slot]));
    expect(mapped.every((m) => m.slot === slotOf.get(m.truth))).toBe(true);
    expect(new Set(slotOf.values()).size).toBe(2);
  });
});
