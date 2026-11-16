import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { consentedAndCached, fakes, resetBridge, resetFakesAndRegistry } from './diarization-bridge-fakes';
import type { DiarizationTestTurn } from './types/diarization-test';

const rescored = vi.hoisted(() => new Map<string, (turns: DiarizationTestTurn[]) => void>());

vi.mock('@/lib/asr/browser', async (importOriginal) =>
  (await import('./diarization-bridge-fakes')).mockAsrBrowser(importOriginal));

vi.mock('@/lib/diarization/browser', async () => {
  const base = (await import('./diarization-bridge-fakes')).mockDiarizationBrowser();
  return {
    createDiarizer: (opts: { source: string }) => ({
      ...base.createDiarizer(opts),
      onRescored(cb: (turns: DiarizationTestTurn[]) => void) {
        rescored.set(opts.source, cb);
        return () => {};
      },
    }),
  };
});

beforeEach(async () => {
  rescored.clear();
  await resetFakesAndRegistry();
});

afterEach(resetBridge);

async function stoppedMeeting(segments: number) {
  const m = await consentedAndCached();
  m.bridge.startDiarization(['mic']);
  fakes.turn.get('mic')!({ speaker: 'mic:0', source: 'mic', start: 0, end: 1000, id: 'mic#0', final: true });
  for (let i = 0; i < segments; i += 1) {
    m.store.upsertSegment({ id: `s${i}`, source: 'mic', speaker: 'mic:0', text: `w${i}`, start: i * 2, end: i * 2 + 1, final: true });
  }
  m.bridge.stopDiarization();
  return m;
}

const rescore: DiarizationTestTurn[] = [
  { speaker: 'mic:0', source: 'mic', start: 0, end: 4, id: 'mic#r0', final: true },
  { speaker: 'mic:9', source: 'mic', start: 4, end: 1000, id: 'mic#r1', final: true },
];

describe('diarization rescore', () => {
  it('relabels every segment of the source after stop, including speakers past mic:7', async () => {
    const { store } = await stoppedMeeting(3);
    rescored.get('mic')!(rescore);
    const speakers = store.getState().segments.map((s) => s.speaker);
    expect(speakers).toEqual(['mic:0', 'mic:0', 'mic:9']);
    expect(store.getState().speakers['mic:9']?.label).toMatch(/^Speaker \d+$/);
  });

  it('reaches segments older than the live relabel lookback', async () => {
    const { store } = await stoppedMeeting(260);
    rescored.get('mic')!([{ ...rescore[1], start: 0 }]);
    expect(new Set(store.getState().segments.map((s) => s.speaker))).toEqual(new Set(['mic:9']));
  });

  it('drops a rescore that arrives after the turns were reset', async () => {
    const { store, bridge } = await stoppedMeeting(3);
    bridge.resetDiarization();
    rescored.get('mic')!(rescore);
    expect(store.getState().segments.map((s) => s.speaker)).toEqual(['mic:0', 'mic:0', 'mic:0']);
  });

  it('drops a rescore that arrives after another transcript was opened', async () => {
    const { store } = await stoppedMeeting(3);
    const { setTranscriptSessionId, getTranscriptSessionId } = await import('./transcript-session');
    setTranscriptSessionId(`${getTranscriptSessionId()}-other`);
    rescored.get('mic')!(rescore);
    expect(store.getState().segments.map((s) => s.speaker)).toEqual(['mic:0', 'mic:0', 'mic:0']);
  });
});
