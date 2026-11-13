import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  consentedAndCached,
  fakes,
  resetBridge,
  resetFakesAndRegistry
} from './diarization-bridge-fakes';

vi.mock('@/lib/asr/browser', async (importOriginal) =>
  (await import('./diarization-bridge-fakes')).mockAsrBrowser(importOriginal));

vi.mock('@/lib/diarization/browser', async () =>
  (await import('./diarization-bridge-fakes')).mockDiarizationBrowser());

beforeEach(resetFakesAndRegistry);

afterEach(resetBridge);

describe('diarization bridge — open turns', () => {
  it('labels new speech with an open turn\'s speaker, replaces it when it grows, and cuts only at closed ends', async () => {
    const { bridge, store } = await consentedAndCached();
    const asr = await import('./asr/speaker');
    const timeline = vi.spyOn(asr, 'setSpeakerTimeline');
    const labeler = vi.spyOn(asr, 'setSpeakerLabeler');
    bridge.startDiarization(['mic']);
    const emit = fakes.turn.get('mic')!;
    const tl = timeline.mock.calls.at(-1)![0]!;
    const label = labeler.mock.calls.at(-1)![0]!;

    emit({ speaker: 'mic:0', source: 'mic', start: 0, end: 4, id: 'mic#0', final: true });
    store.upsertSegment({ id: 's', source: 'mic', speaker: 'mic:0', text: 'hello', start: 5, end: 6, final: true });
    emit({ speaker: 'mic:1', source: 'mic', start: 4.5, end: 6, id: 'mic#1', final: false });
    expect(store.getState().segments.find((s) => s.id === 's')!.speaker).toBe('mic:1');
    expect(tl.turnEnds('mic', 0, 10)).toEqual([4]);

    emit({ speaker: 'mic:1', source: 'mic', start: 4.5, end: 8, id: 'mic#1', final: true });
    expect(tl.turnEnds('mic', 0, 10)).toEqual([4, 8]);
    expect(tl.speakerFor('mic', 4.5, 8)).toBe('mic:1');
    emit({ speaker: 'mic:0', source: 'mic', start: 1, end: 2, id: 'mic#2', final: true });
    expect(label('mic', new Float32Array(0))).toBe('mic:1');
    timeline.mockRestore();
    labeler.mockRestore();
  });

  it('does not cut at the end of a turn split only for running long', async () => {
    const { bridge } = await consentedAndCached();
    const asr = await import('./asr/speaker');
    const timeline = vi.spyOn(asr, 'setSpeakerTimeline');
    bridge.startDiarization(['mic']);
    const emit = fakes.turn.get('mic')!;
    const tl = timeline.mock.calls.at(-1)![0]!;
    emit({ speaker: 'mic:0', source: 'mic', start: 0, end: 8, id: 'mic#0', final: true, continues: true });
    expect(tl.turnEnds('mic', 0, 12)).toEqual([]);
    emit({ speaker: 'mic:0', source: 'mic', start: 8, end: 12, id: 'mic#1', final: true });
    expect(tl.turnEnds('mic', 0, 14)).toEqual([12]);
    timeline.mockRestore();
  });

  it('does not cut at the end of a back-channel the other speaker talks through', async () => {
    const { bridge } = await consentedAndCached();
    const asr = await import('./asr/speaker');
    const timeline = vi.spyOn(asr, 'setSpeakerTimeline');
    bridge.startDiarization(['mic']);
    const emit = fakes.turn.get('mic')!;
    const tl = timeline.mock.calls.at(-1)![0]!;
    emit({ speaker: 'mic:0', source: 'mic', start: 0, end: 6, id: 'mic#0', final: false });
    emit({ speaker: 'mic:1', source: 'mic', start: 3, end: 3.6, id: 'mic#1', final: true });
    expect(tl.turnEnds('mic', 0, 6)).toEqual([]);
    emit({ speaker: 'mic:0', source: 'mic', start: 0, end: 8, id: 'mic#0', final: true, continues: true });
    emit({ speaker: 'mic:0', source: 'mic', start: 8, end: 12, id: 'mic#2', final: false });
    emit({ speaker: 'mic:1', source: 'mic', start: 7.6, end: 8.4, id: 'mic#3', final: true });
    expect(tl.turnEnds('mic', 0, 12)).toEqual([]);
    timeline.mockRestore();
  });

  it('still cuts where the speaker changes or pauses', async () => {
    const { bridge } = await consentedAndCached();
    const asr = await import('./asr/speaker');
    const timeline = vi.spyOn(asr, 'setSpeakerTimeline');
    bridge.startDiarization(['mic']);
    const emit = fakes.turn.get('mic')!;
    const tl = timeline.mock.calls.at(-1)![0]!;
    emit({ speaker: 'mic:0', source: 'mic', start: 0, end: 4, id: 'mic#0', final: true });
    emit({ speaker: 'mic:1', source: 'mic', start: 3.5, end: 9, id: 'mic#1', final: true });
    emit({ speaker: 'mic:0', source: 'mic', start: 10, end: 12, id: 'mic#2', final: true });
    emit({ speaker: 'mic:1', source: 'mic', start: 11.8, end: 12.5, id: 'mic#3', final: true });
    expect(tl.turnEnds('mic', 0, 14)).toEqual([4, 9, 12, 12.5]);
    timeline.mockRestore();
  });
});

